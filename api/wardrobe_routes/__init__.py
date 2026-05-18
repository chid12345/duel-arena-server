"""Wardrobe API — теперь только Легендарная броня (armor_mythic4).

После сноса legacy class-системы тут больше нет /api/wardrobe со списком классов.
Старые free/gold/diamond/mythic1-3 покупаются через armor_overlay_v2 → unified
equip-paths. Все ручки тут — только для USDT-кастомки armor_mythic4.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict

from fastapi import APIRouter

from api.wardrobe_routes.usdt_routes import attach_wardrobe_usdt


def register_wardrobe_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]

    async def _legendary_state(init_data: str) -> dict:
        """Свежее состояние Легендарной брони (статы, пассивка, applied)."""
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        mods = await asyncio.to_thread(db.get_armor_custom_mods, uid, "armor_mythic4")
        owned = await asyncio.to_thread(db.is_armor_owned, uid, "armor_mythic4")
        return {"armor_mods": mods, "owned": owned}

    attach_wardrobe_usdt(router, ctx, _legendary_state)
    app.include_router(router)
