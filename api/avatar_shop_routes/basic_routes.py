"""Список образов, покупка, экипировка."""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from api.avatar_shop_routes.models import AvatarBody

logger = logging.getLogger(__name__)


def attach_avatar_basic(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]

    @router.get("/api/avatars")
    async def avatars(init_data: str):
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            username = tg_user.get("username") or tg_user.get("first_name") or ""
            db.get_or_create_player(uid, username)
            return db.get_player_avatar_state(uid)
        except Exception as e:
            logger.error("avatars load failed: %s", e, exc_info=True)
            return {"ok": False, "reason": f"avatars_error: {str(e)[:120]}"}

    @router.post("/api/avatars/buy")
    async def avatars_buy(body: AvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        result = db.buy_avatar(uid, body.avatar_id.strip())
        if result.get("ok"):
            db.track_purchase(uid, body.avatar_id.strip(), result.get("currency", "gold"), result.get("price", 0))
            _cache_invalidate(uid)
            state = db.get_player_avatar_state(uid)
            player = db.get_or_create_player(uid, "")
            result["avatars"] = state.get("avatars", [])
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/avatars/equip")
    async def avatars_equip(body: AvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        result = db.equip_avatar(uid, body.avatar_id.strip())
        if result.get("ok"):
            _cache_invalidate(uid)
            state = db.get_player_avatar_state(uid)
            player = db.get_or_create_player(uid, "")
            result["avatars"] = state.get("avatars", [])
            result["player"] = _player_api(dict(player))
        return result
