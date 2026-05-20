"""Маршруты /api/equipment/* — надеть/снять предметы из Mini App."""

from __future__ import annotations

import logging

from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _rl_check, _cache_invalidate
from api.tma_models import InitDataHeader
from api.tma_player_api import _player_api
from database import db
from db_schema.equipment_catalog import get_item
from economy.curves import is_tier_unlocked
from economy.level_pricing import get_item_cost

_log = logging.getLogger(__name__)


def _item_dict(item_id: str, item: dict) -> dict:
    return {"item_id": item_id, "name": item["name"], "emoji": item["emoji"],
            "rarity": item["rarity"], "desc": item.get("desc", "")}


class _EquipBody(InitDataHeader):
    item_id: str
    slot: str


class _UnequipBody(InitDataHeader):
    slot: str


def register_equipment_routes(app: FastAPI) -> None:

    @app.post("/api/equipment/equip")
    def equip_item(body: _EquipBody):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            _rl_check(uid, "equipment", max_hits=20, window_sec=10)

            item = get_item(body.item_id)
            if not item:
                return {"ok": False, "reason": "Предмет не найден"}

            # Этап 3F: tier-блокировка для TMA (та же логика что в repositories/equipment).
            # Если предмет уже в коллекции (owned) или арендован — пропускаем блок.
            # armor2: owned хранится в отдельной таблице player_owned_armor2,
            # остальные слоты — в player_owned_weapons.
            item_tier = item.get("tier")
            if body.slot == "armor2":
                _owned = db.is_armor2_owned(uid, body.item_id)
            else:
                _owned = body.item_id in db.get_owned_weapons(uid)
            _rented = db.has_active_rental(uid, body.item_id)
            if item_tier and not _owned and not _rented:
                # Уровень игрока
                _conn_lvl = db.get_connection()
                try:
                    _cur_lvl = _conn_lvl.cursor()
                    _cur_lvl.execute("SELECT level FROM players WHERE user_id = ?", (uid,))
                    _row_lvl = _cur_lvl.fetchone()
                    _pl_level = int(_row_lvl["level"] or 1) if _row_lvl else 1
                finally:
                    _conn_lvl.close()
                if not is_tier_unlocked(_pl_level, item_tier):
                    rec = item.get("recommended_level", "?")
                    return {"ok": False, "reason": f"🔒 Нужен {rec} ур. для {item_tier}"}

            if int(item.get("price_stars", 0)) > 0:
                # Разрешаем надеть если уже куплено или есть активная аренда (Этап 8)
                if not _owned and not _rented:
                    return {"ok": False, "reason": "Мифическое оружие покупается за Stars или USDT — или арендуется на 7 дней"}

            # Цена через формулу (та же что в боте, этап 3D). Fallback на legacy.
            _cost, _currency = get_item_cost(item)
            gold_cost = _cost if _currency == "gold" else 0
            diamond_cost = _cost if _currency == "diamond" else 0

            conn = db.get_connection()
            try:
                cur = conn.cursor()

                # Один SELECT: всё что нужно знать о игроке
                cur.execute("SELECT * FROM players WHERE user_id = ?", (uid,))
                prow = cur.fetchone()
                if not prow:
                    return {"ok": False, "reason": "Игрок не найден"}

                gold = int(prow["gold"] or 0)
                diamonds = int(prow["diamonds"] or 0)

                # Текущая экипировка в слоте
                cur.execute(
                    "SELECT item_id FROM player_equipment WHERE user_id = ? AND slot = ?",
                    (uid, body.slot),
                )
                eq_row = cur.fetchone()
                already_equipped = eq_row and eq_row["item_id"] == body.item_id

                # Проверяем наличие в коллекции (для платных предметов).
                # Все слоты, включая броню (armor2_*), — в общей player_owned_weapons.
                already_owned = False
                if (gold_cost > 0 or diamond_cost > 0) and not already_equipped:
                    cur.execute(
                        "SELECT 1 FROM player_owned_weapons WHERE user_id = ? AND item_id = ?",
                        (uid, body.item_id),
                    )
                    already_owned = cur.fetchone() is not None

                if not already_equipped and not already_owned:
                    if gold_cost > 0:
                        if gold < gold_cost:
                            return {"ok": False, "reason": f"Недостаточно золота. Нужно {gold_cost}"}
                        cur.execute(
                            "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
                            (gold_cost, uid, gold_cost),
                        )
                        if cur.rowcount == 0:
                            return {"ok": False, "reason": "Недостаточно золота"}
                        gold -= gold_cost
                        cur.execute(
                            "INSERT INTO player_owned_weapons (user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            (uid, body.item_id),
                        )
                    elif diamond_cost > 0:
                        if diamonds < diamond_cost:
                            return {"ok": False, "reason": f"Недостаточно алмазов. Нужно {diamond_cost}"}
                        cur.execute(
                            "UPDATE players SET diamonds = diamonds - ? WHERE user_id = ? AND diamonds >= ?",
                            (diamond_cost, uid, diamond_cost),
                        )
                        if cur.rowcount == 0:
                            return {"ok": False, "reason": "Недостаточно алмазов"}
                        diamonds -= diamond_cost
                        cur.execute(
                            "INSERT INTO player_owned_weapons (user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                            (uid, body.item_id),
                        )

                # Экипируем
                cur.execute(
                    """INSERT INTO player_equipment (user_id, slot, item_id)
                       VALUES (?, ?, ?)
                       ON CONFLICT(user_id, slot) DO UPDATE SET item_id=excluded.item_id, equipped_at=CURRENT_TIMESTAMP""",
                    (uid, body.slot, body.item_id),
                )
                # UI профиля показывает только ring1. Чтобы не накапливались дубли
                # от legacy-логики (когда второе кольцо уходило в ring2) — при
                # надевании любого кольца в ring1 сразу чистим ring2.
                if body.slot == "ring1":
                    cur.execute(
                        "DELETE FROM player_equipment WHERE user_id = ? AND slot = 'ring2'",
                        (uid,),
                    )

                # Все owned для ответа — общая таблица. Оружие = не-броня,
                # owned_armor2 = только armor2* (фронт читает State.ownedArmor2).
                # Паттерн параметром: '%' литералом ломает psycopg на Postgres.
                cur.execute("SELECT item_id FROM player_owned_weapons WHERE user_id = ? AND item_id NOT LIKE ?", (uid, "armor2%"))
                owned_ids = [r["item_id"] for r in cur.fetchall()]
                cur.execute("SELECT item_id FROM player_owned_weapons WHERE user_id = ? AND item_id LIKE ?", (uid, "armor2%"))
                owned_armor2_ids = [r["item_id"] for r in cur.fetchall()]

                # Все слоты экипировки для ответа
                cur.execute("SELECT slot, item_id FROM player_equipment WHERE user_id = ?", (uid,))
                all_eq = {r["slot"]: r["item_id"] for r in cur.fetchall()}
                # Добавляем только что экипированное (может не попасть в fetchall если только что вставлено)
                all_eq[body.slot] = body.item_id

                conn.commit()
            finally:
                conn.close()

            _cache_invalidate(uid)

            # Строим eq_resp из каталога (без лишних DB-вызовов)
            eq_resp = {}
            for slot, iid in all_eq.items():
                it = get_item(iid)
                if it:
                    eq_resp[slot] = _item_dict(iid, it)

            # Строим player_resp из уже загруженных данных
            try:
                pd = dict(prow)
                pd["gold"] = gold
                pd["diamonds"] = diamonds
                player_resp = _player_api(pd)
            except Exception:
                player_resp = {}

            return {"ok": True, "equipment": eq_resp, "player": player_resp,
                    "owned_weapons": owned_ids, "owned_armor2": owned_armor2_ids}

        except Exception as e:
            _log.error("equip_item error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}

    @app.post("/api/equipment/unequip")
    def unequip_item(body: _UnequipBody):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            _rl_check(uid, "equipment", max_hits=20, window_sec=10)

            conn = db.get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "DELETE FROM player_equipment WHERE user_id = ? AND slot = ?",
                    (uid, body.slot),
                )
                # Если сняли ring1 и в ring2 что-то есть (legacy до фикса _resolve_ring_slot) —
                # продвигаем ring2 → ring1, чтобы UI профиля показывал актуальное кольцо.
                if body.slot == "ring1":
                    cur.execute(
                        "SELECT item_id FROM player_equipment WHERE user_id = ? AND slot = 'ring2'",
                        (uid,),
                    )
                    _r2 = cur.fetchone()
                    if _r2:
                        cur.execute(
                            "INSERT INTO player_equipment (user_id, slot, item_id) VALUES (?, 'ring1', ?)",
                            (uid, _r2["item_id"]),
                        )
                        cur.execute(
                            "DELETE FROM player_equipment WHERE user_id = ? AND slot = 'ring2'",
                            (uid,),
                        )
                cur.execute("SELECT slot, item_id FROM player_equipment WHERE user_id = ?", (uid,))
                all_eq = {r["slot"]: r["item_id"] for r in cur.fetchall()}
                cur.execute("SELECT item_id FROM player_owned_weapons WHERE user_id = ?", (uid,))
                owned_ids = [r["item_id"] for r in cur.fetchall()]
                conn.commit()
            finally:
                conn.close()

            _cache_invalidate(uid)

            eq_resp = {}
            for slot, iid in all_eq.items():
                it = get_item(iid)
                if it:
                    eq_resp[slot] = _item_dict(iid, it)

            return {"ok": True, "equipment": eq_resp, "owned_weapons": owned_ids}

        except Exception as e:
            _log.error("unequip_item error: %s", e, exc_info=True)
            return {"ok": False, "reason": "Ошибка сервера"}
