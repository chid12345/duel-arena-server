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


def _eq_dict(eq_raw: dict) -> dict:
    return {
        slot: {"item_id": it["item_id"], "name": it["name"], "emoji": it["emoji"],
               "rarity": it["rarity"], "desc": it.get("desc", "")}
        for slot, it in eq_raw.items()
    }


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

            # Мифическое оружие — только через отдельный роут оплаты
            if int(item.get("price_stars", 0)) > 0:
                return {"ok": False, "reason": "Мифическое оружие покупается за Stars или USDT — используйте кнопки ⭐ или 💳"}

            gold_cost = int(item.get("price_gold", 0))
            diamond_cost = int(item.get("price_diamonds", 0))

            # Один запрос к БД: получаем игрока + текущую экипировку
            conn = db.get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT gold, diamonds FROM players WHERE user_id = ?", (uid,))
                prow = cur.fetchone()
                if not prow:
                    return {"ok": False, "reason": "Игрок не найден"}
                gold = int(prow["gold"] or 0)
                diamonds = int(prow["diamonds"] or 0)

                cur.execute("SELECT slot, item_id FROM player_equipment WHERE user_id = ?", (uid,))
                current = {r["slot"]: r["item_id"] for r in cur.fetchall()}
                already_equipped = current.get(body.slot) == body.item_id

                if not already_equipped:
                    if gold_cost > 0:
                        if gold < gold_cost:
                            return {"ok": False, "reason": f"Недостаточно золота. Нужно {gold_cost}"}
                        cur.execute(
                            "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
                            (gold_cost, uid, gold_cost),
                        )
                        if cur.rowcount == 0:
                            return {"ok": False, "reason": "Недостаточно золота"}
                    elif diamond_cost > 0:
                        if diamonds < diamond_cost:
                            return {"ok": False, "reason": f"Недостаточно алмазов. Нужно {diamond_cost}"}
                        cur.execute(
                            "UPDATE players SET diamonds = diamonds - ? WHERE user_id = ? AND diamonds >= ?",
                            (diamond_cost, uid, diamond_cost),
                        )
                        if cur.rowcount == 0:
                            return {"ok": False, "reason": "Недостаточно алмазов"}

                # UPSERT weapon slot
                cur.execute(
                    """INSERT INTO player_equipment (user_id, slot, item_id)
                       VALUES (?, ?, ?)
                       ON CONFLICT(user_id, slot) DO UPDATE SET item_id=excluded.item_id, equipped_at=CURRENT_TIMESTAMP""",
                    (uid, body.slot, body.item_id),
                )
                conn.commit()
            finally:
                conn.close()

            _cache_invalidate(uid)

            # Собираем ответ одним запросом
            try:
                eq_raw = db.get_equipment(uid)
                eq_resp = _eq_dict(eq_raw)
            except Exception:
                eq_resp = {}
            try:
                p = db.get_or_create_player(uid, "")
                player_resp = _player_api(dict(p))
            except Exception:
                player_resp = {}

            return {"ok": True, "equipment": eq_resp, "player": player_resp}

        except Exception as e:
            _log.error("equip_item error: %s", e, exc_info=True)
            return {"ok": False, "reason": f"Ошибка сервера: {e}"}

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
                conn.commit()
            finally:
                conn.close()

            _cache_invalidate(uid)

            try:
                eq_raw = db.get_equipment(uid)
                eq_resp = _eq_dict(eq_raw)
            except Exception:
                eq_resp = {}
            try:
                p = db.get_or_create_player(uid, "")
                player_resp = _player_api(dict(p))
            except Exception:
                player_resp = {}

            return {"ok": True, "equipment": eq_resp, "player": player_resp}

        except Exception as e:
            _log.error("unequip_item error: %s", e, exc_info=True)
            return {"ok": False, "reason": f"Ошибка сервера: {e}"}
