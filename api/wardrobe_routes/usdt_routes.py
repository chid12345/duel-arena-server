"""Легендарная броня (armor_mythic4): создание, переименование, распределение +19 статов, пассивка.

После сноса legacy class-системы все ручки идут через armor_custom_mods —
никакого user_inventory/class_id. legendary armor у игрока ОДИН (mythic4).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable, Dict

from fastapi import APIRouter

from api.wardrobe_routes.models import (
    InitDataHeader,
    USDTNameBody,
    USDTPassiveBody,
    USDTTrainBody,
)
from api.wardrobe_routes.usdt_crypto_routes import attach_wardrobe_usdt_crypto

logger = logging.getLogger(__name__)


def attach_wardrobe_usdt(
    router: APIRouter,
    ctx: Dict[str, Any],
    wardrobe: Callable[..., Awaitable[dict]],
) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]
    RESET_STATS_COST_DIAMONDS = ctx["RESET_STATS_COST_DIAMONDS"]
    RESET_STATS_COST_DIAMONDS_USDT = ctx["RESET_STATS_COST_DIAMONDS_USDT"]

    def _player_response(uid: int) -> dict:
        p = dict(db.get_or_create_player(uid, ""))
        usdt_passive = db.get_equipped_legendary_passive(uid)
        if usdt_passive:
            p["usdt_passive_type"] = usdt_passive
        return _player_api(p)

    attach_wardrobe_usdt_crypto(router, ctx, _player_response)

    @router.post("/api/wardrobe/usdt/create")
    async def wardrobe_usdt_create(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        await asyncio.to_thread(db.get_or_create_player, uid, username)
        success, message = await asyncio.to_thread(db.create_legendary_armor, uid)
        result = {"ok": success, "message": message}
        if success:
            _cache_invalidate(uid)
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/usdt/rename")
    async def wardrobe_usdt_rename(body: USDTNameBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg = await asyncio.to_thread(db.set_legendary_name, uid, body.custom_name)
        result = {"ok": ok, "message": msg}
        if ok:
            result.update(await wardrobe(body.init_data))
        return result

    @router.get("/api/wardrobe/reset-cost")
    async def wardrobe_reset_cost(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        has_usdt = await asyncio.to_thread(db.has_legendary_armor, uid)
        cost = RESET_STATS_COST_DIAMONDS_USDT if has_usdt else RESET_STATS_COST_DIAMONDS
        return {
            "ok": True,
            "cost_diamonds": cost,
            "has_usdt_discount": has_usdt,
            "regular_cost": RESET_STATS_COST_DIAMONDS,
            "discounted_cost": RESET_STATS_COST_DIAMONDS_USDT,
        }

    @router.post("/api/wardrobe/usdt/apply-stats")
    async def wardrobe_usdt_apply_stats(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = await asyncio.to_thread(db.apply_legendary_stats, uid)
        if ok:
            _cache_invalidate(uid)
            player = await asyncio.to_thread(_player_response, uid)
            return {"ok": True, "message": msg, "armor_mods": item, "player": player}
        return {"ok": False, "message": msg, "armor_mods": item}

    @router.post("/api/wardrobe/usdt/train")
    async def wardrobe_usdt_train(body: USDTTrainBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = await asyncio.to_thread(db.train_legendary_stat, uid, body.stat.strip())
        if ok:
            _cache_invalidate(uid)
            player = await asyncio.to_thread(_player_response, uid)
            return {"ok": True, "message": msg, "armor_mods": item, "player": player}
        return {"ok": False, "message": msg, "armor_mods": item}

    @router.post("/api/wardrobe/usdt/untrain")
    async def wardrobe_usdt_untrain(body: USDTTrainBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = await asyncio.to_thread(db.untrain_legendary_stat, uid, body.stat.strip())
        if ok:
            _cache_invalidate(uid)
            player = await asyncio.to_thread(_player_response, uid)
            return {"ok": True, "message": msg, "armor_mods": item, "player": player}
        return {"ok": False, "message": msg, "armor_mods": item}

    @router.post("/api/wardrobe/usdt/set-passive")
    async def wardrobe_usdt_set_passive(body: USDTPassiveBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = await asyncio.to_thread(db.set_legendary_passive, uid, body.passive_type)
        if ok:
            _cache_invalidate(uid)
            player = await asyncio.to_thread(_player_response, uid)
            return {"ok": True, "message": msg, "armor_mods": item, "player": player}
        return {"ok": False, "message": msg, "armor_mods": item}
