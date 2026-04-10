"""GET гардероба, покупка, экипировка, ресинк."""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable, Dict

from fastapi import APIRouter

from api.wardrobe_routes.models import InitDataHeader, WardrobeBuyBody, WardrobeEquipBody

logger = logging.getLogger(__name__)


def attach_wardrobe_core(
    router: APIRouter,
    ctx: Dict[str, Any],
) -> Callable[..., Awaitable[dict]]:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]
    FREE_CLASSES = ctx["FREE_CLASSES"]
    GOLD_CLASSES = ctx["GOLD_CLASSES"]
    DIAMONDS_CLASSES = ctx["DIAMONDS_CLASSES"]
    USDT_CLASS_BASE = ctx["USDT_CLASS_BASE"]

    @router.get("/api/wardrobe")
    async def wardrobe(init_data: str):
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            username = tg_user.get("username") or tg_user.get("first_name") or ""
            db.get_or_create_player(uid, username)
            available_classes = db.get_available_classes_for_user(uid)
            equipped_class = db.get_equipped_class(uid)
            inventory = db.get_user_inventory(uid)
            usdt_items = [item for item in inventory if item["class_type"] == "usdt"]
            reset_cost = db.get_reset_stats_cost(uid)
            return {
                "ok": True,
                "available_classes": available_classes,
                "equipped_class": equipped_class,
                "inventory": inventory,
                "usdt_items": usdt_items,
                "reset_cost_diamonds": reset_cost,
                "config": {
                    "free_classes": FREE_CLASSES,
                    "gold_classes": GOLD_CLASSES,
                    "diamonds_classes": DIAMONDS_CLASSES,
                    "usdt_base": USDT_CLASS_BASE,
                },
            }
        except Exception as e:
            logger.error("wardrobe load failed: %s", e, exc_info=True)
            return {"ok": False, "reason": f"wardrobe_error: {str(e)[:120]}"}

    @router.post("/api/wardrobe/buy")
    async def wardrobe_buy(body: WardrobeBuyBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message = db.purchase_class(uid, body.class_id.strip())
        result = {"ok": success, "message": message}
        if success:
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/equip")
    async def wardrobe_equip(body: WardrobeEquipBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message = db.switch_class(uid, body.class_id.strip())
        result = {"ok": success, "message": message}
        if success:
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/unequip")
    async def wardrobe_unequip(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message = db.unequip_class(uid)
        result = {"ok": bool(success), "message": message}
        if success:
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/resync")
    async def wardrobe_resync(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message = db.resync_player_stats(uid)
        result = {"ok": bool(success), "message": message}
        if success:
            _cache_invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result.update(await wardrobe(body.init_data))
        return result

    return wardrobe
