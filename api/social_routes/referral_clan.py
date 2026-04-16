"""Только рефералка (без вывода USDT). Кланы вынесены в clan_routes.py."""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

logger = logging.getLogger(__name__)


def attach_social_referral_clan(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]

    @router.get("/api/referral")
    async def get_referral_info(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        code = db.get_referral_code(uid)
        stats = db.get_referral_stats(uid)
        recent = db.get_recent_referrals(uid, limit=5)
        return {
            "ok": True,
            "referral_code": code,
            "link": f"https://t.me/ZenDuelArena_bot?start={code}",
            "invited_count": stats["invited_count"],
            "paying_subscribers": stats["paying_subscribers"],
            "total_reward_diamonds": stats["total_reward_diamonds"],
            "total_reward_gold": stats["total_reward_gold"],
            "total_reward_usdt": stats["total_reward_usdt"],
            "usdt_balance": stats["usdt_balance"],
            "can_withdraw": stats["can_withdraw"],
            "cooldown_hours": stats["cooldown_hours"],
            "withdraw_min": 5.0,
            "recent": recent,
        }
