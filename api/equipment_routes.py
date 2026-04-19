"""Маршруты /api/equipment/* — надеть/снять предметы из Mini App."""

from __future__ import annotations

from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _rl_check, _cache_invalidate
from api.tma_models import InitDataHeader
from database import db
from db_schema.equipment_catalog import get_item


def _eq_response(uid: int) -> dict:
    """Возвращает equipment dict для ответа API."""
    try:
        eq_raw = db.get_equipment(uid)
        return {
            slot: {"item_id": it["item_id"], "name": it["name"], "emoji": it["emoji"],
                   "rarity": it["rarity"], "desc": it.get("desc", "")}
            for slot, it in eq_raw.items()
        }
    except Exception:
        return {}


class _EquipBody(InitDataHeader):
    item_id: str
    slot: str


class _UnequipBody(InitDataHeader):
    slot: str


def register_equipment_routes(app: FastAPI) -> None:

    @app.post("/api/equipment/equip")
    def equip_item(body: _EquipBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "equipment", max_hits=20, window_sec=10)

        item = get_item(body.item_id)
        if not item:
            return {"ok": False, "reason": "Предмет не найден"}

        player = db.get_or_create_player(uid, tg_user.get("username") or "")
        gold = int(player.get("gold", 0))
        diamonds = int(player.get("diamonds", 0))

        # Check if already equipped (free re-equip)
        current = db.get_equipment(uid)
        already = current.get(body.slot, {}) or {}
        if not already or already.get("item_id") != body.item_id:
            gold_cost = int(item.get("price_gold", 0))
            diamond_cost = int(item.get("price_diamonds", 0))
            if gold_cost > 0:
                if gold < gold_cost:
                    return {"ok": False, "reason": f"Недостаточно золота. Нужно {gold_cost}"}
                conn = db.get_connection()
                cur = conn.cursor()
                cur.execute("UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
                            (gold_cost, uid, gold_cost))
                ok = cur.rowcount > 0
                conn.commit(); conn.close()
                if not ok:
                    return {"ok": False, "reason": "Недостаточно золота"}
            elif diamond_cost > 0:
                if diamonds < diamond_cost:
                    return {"ok": False, "reason": f"Недостаточно алмазов. Нужно {diamond_cost}"}
                conn = db.get_connection()
                cur = conn.cursor()
                cur.execute("UPDATE players SET diamonds = diamonds - ? WHERE user_id = ? AND diamonds >= ?",
                            (diamond_cost, uid, diamond_cost))
                conn.commit(); conn.close()

        db.equip_item(uid, body.slot, body.item_id)
        _cache_invalidate(uid)
        return {"ok": True, "equipment": _eq_response(uid)}

    @app.post("/api/equipment/unequip")
    def unequip_item(body: _UnequipBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "equipment", max_hits=20, window_sec=10)

        db.unequip_item(uid, body.slot)
        _cache_invalidate(uid)
        return {"ok": True, "equipment": _eq_response(uid)}
