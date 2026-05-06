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
            if int(item.get("price_stars", 0)) > 0:
                # Разрешаем надеть если уже куплено
                if body.item_id not in db.get_owned_weapons(uid):
                    return {"ok": False, "reason": "Мифическое оружие покупается за Stars или USDT — используйте кнопки ⭐ или 💳"}

            gold_cost = int(item.get("price_gold", 0))
            diamond_cost = int(item.get("price_diamonds", 0))

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

                # Проверяем наличие в коллекции (для платных предметов)
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

                # Получаем все owned_weapons для ответа
                cur.execute("SELECT item_id FROM player_owned_weapons WHERE user_id = ?", (uid,))
                owned_ids = [r["item_id"] for r in cur.fetchall()]

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

            return {"ok": True, "equipment": eq_resp, "player": player_resp, "owned_weapons": owned_ids}

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
