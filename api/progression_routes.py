from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from api.tma_player_api import _player_api
from api.tma_infra import _global_cache_get, _global_cache_set, get_user_lock


class ClaimQuestBody(BaseModel):
    init_data: str


def register_progression_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _cache_invalidate = ctx["_cache_invalidate"]
    @router.get("/api/season")
    async def get_season_info(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        # Глобальный кеш лидерборда (60 сек) — одинаков для всех пользователей
        cached_lb = _global_cache_get("season_leaderboard")
        if cached_lb is not None:
            season, lb = cached_lb
        else:
            season = db.get_active_season()
            lb = db.get_season_leaderboard(season["id"], limit=20) if season else []
            if season:
                _global_cache_set("season_leaderboard", (dict(season), lb))
        if not season:
            return {"ok": True, "season": None, "leaderboard": [], "my_stats": None}
        my_pos = next((i + 1 for i, r in enumerate(lb) if r["user_id"] == uid), None)
        my_stat = next((r for r in lb if r["user_id"] == uid), None)
        return {"ok": True, "season": dict(season), "leaderboard": lb, "my_stats": my_stat, "my_pos": my_pos}

    @router.get("/api/daily/status")
    async def daily_status(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        status = db.get_daily_bonus_status(uid)
        return {"ok": True, **status}

    @router.get("/api/quests")
    async def get_quests(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        quest = db.get_daily_quest_status(uid)
        daily = db.check_daily_bonus(uid)
        return {"ok": True, "quest": quest, "daily": daily}

    @router.post("/api/quests/claim")
    async def claim_quest(body: ClaimQuestBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        async with get_user_lock(uid):
            result = db.claim_daily_quest_reward(uid)
            if result.get("ok"):
                player = db.get_or_create_player(uid, "")
                result["player"] = _player_api(dict(player))
            return result

    @router.post("/api/daily/claim")
    async def claim_daily(body: ClaimQuestBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        async with get_user_lock(uid):
            result = db.check_daily_bonus(uid)
            if not result.get("can_claim"):
                return {"ok": False, "reason": "Бонус уже получен сегодня"}
            player = db.get_or_create_player(uid, "")
            result["ok"] = True
            result["player"] = _player_api(dict(player))
            return result

    app.include_router(router)
