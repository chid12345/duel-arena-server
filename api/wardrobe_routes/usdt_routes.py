"""USDT-образы и стоимость сброса статов."""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable, Dict

from fastapi import APIRouter

from api.wardrobe_routes.models import InitDataHeader, USDTBody, USDTNameBody

logger = logging.getLogger(__name__)


def attach_wardrobe_usdt(
    router: APIRouter,
    ctx: Dict[str, Any],
    wardrobe: Callable[..., Awaitable[dict]],
) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _cache_invalidate = ctx["_cache_invalidate"]
    RESET_STATS_COST_DIAMONDS = ctx["RESET_STATS_COST_DIAMONDS"]
    RESET_STATS_COST_DIAMONDS_USDT = ctx["RESET_STATS_COST_DIAMONDS_USDT"]

    @router.post("/api/wardrobe/usdt/create")
    async def wardrobe_usdt_create(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message, new_class_id = db.create_usdt_class(uid)
        result = {"ok": success, "message": message, "new_class_id": new_class_id}
        if success:
            _cache_invalidate(uid)
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/usdt/save")
    async def wardrobe_usdt_save(body: USDTBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message = db.save_usdt_stats(uid, body.class_id.strip())
        result = {"ok": success, "message": message}
        if success:
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/usdt/rename")
    async def wardrobe_usdt_rename(body: USDTNameBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        inventory = db.get_user_inventory(uid)
        usdt_item = next((item for item in inventory if item["class_id"] == body.class_id), None)
        if not usdt_item or usdt_item["class_type"] != "usdt":
            return {"ok": False, "message": "USDT-образ не найден"}
        conn = db.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE user_inventory SET custom_name = ? WHERE user_id = ? AND class_id = ?",
                (body.custom_name.strip()[:50], uid, body.class_id),
            )
            conn.commit()
            result = {"ok": True, "message": "Название обновлено"}
            result.update(await wardrobe(body.init_data))
            return result
        except Exception as e:
            conn.rollback()
            logger.error("usdt rename failed: %s", e)
            return {"ok": False, "message": f"Ошибка: {str(e)}"}
        finally:
            conn.close()

    @router.get("/api/wardrobe/reset-cost")
    async def wardrobe_reset_cost(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        cost = db.get_reset_stats_cost(uid)
        has_usdt = any(item["class_type"] == "usdt" for item in db.get_user_inventory(uid))
        return {
            "ok": True,
            "cost_diamonds": cost,
            "has_usdt_discount": has_usdt,
            "regular_cost": RESET_STATS_COST_DIAMONDS,
            "discounted_cost": RESET_STATS_COST_DIAMONDS_USDT,
        }
