"""API-маршруты системы заданий: /api/tasks/*"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from api.tma_player_api import _player_api


class TaskClaimBody(BaseModel):
    init_data: str
    task_key: str


class AchClaimBody(BaseModel):
    init_data: str
    quest_key: str
    tier: int


class StreakClaimBody(BaseModel):
    init_data: str
    day_num: int


class InitDataBody(BaseModel):
    init_data: str


def _iso_week() -> str:
    from datetime import datetime
    y, w, _ = datetime.utcnow().isocalendar()
    return f"{int(y)}-W{int(w):02d}"


def register_task_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user = ctx["get_user_from_init_data"]
    invalidate = ctx["_cache_invalidate"]

    @router.post("/api/tasks/login")
    def task_login(body: InitDataBody):
        """Обработать вход — обновить стрик."""
        import logging
        _log = logging.getLogger(__name__)
        try:
            tg = get_user(body.init_data)
            uid = int(tg["id"])
            result = db.process_login_streak(uid)
            status = db.get_login_streak_status(uid)
            return {"ok": True, "streak": status, "advanced": result.get("advanced", False)}
        except Exception as e:
            _log.error("task_login error: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.get("/api/tasks/status")
    def tasks_status(init_data: str):
        """Полный статус всех заданий."""
        import logging
        _log = logging.getLogger(__name__)
        try:
            tg = get_user(init_data)
            uid = int(tg["id"])
            week_key = _iso_week()

            daily = db.get_daily_tasks_status(uid)
            weekly_extra = db.get_weekly_extra_status(uid, week_key)
            achievements = db.get_achievements_status(uid)
            streak = db.get_login_streak_status(uid)

            # Считаем сколько наград можно забрать прямо сейчас
            claimable = 0
            for t in daily:
                if t["is_completed"] and not t["reward_claimed"]:
                    claimable += 1
            for t in weekly_extra:
                if t["is_completed"] and not t["reward_claimed"]:
                    claimable += 1
            for a in achievements:
                if a.get("can_claim_tier") is not None:
                    claimable += 1
            # Стрик: текущий день готов к забору?
            sd = streak.get("streak_day", 0)
            claimed_days = streak.get("days_claimed", [])
            if sd > 0 and sd not in claimed_days:
                claimable += 1

            return {
                "ok": True,
                "week_key": week_key,
                "daily": daily,
                "weekly_extra": weekly_extra,
                "achievements": achievements,
                "streak": streak,
                "claimable_count": claimable,
            }
        except Exception as e:
            _log.error("tasks_status error uid=%s: %s", locals().get("uid", "?"), e, exc_info=True)
            return {"ok": False, "reason": str(e)}

    @router.post("/api/tasks/claim_daily")
    def claim_daily(body: TaskClaimBody):
        tg = get_user(body.init_data)
        uid = int(tg["id"])
        result = db.claim_daily_task(uid, body.task_key)
        if result.get("ok"):
            invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/tasks/claim_weekly_extra")
    def claim_weekly_extra(body: TaskClaimBody):
        tg = get_user(body.init_data)
        uid = int(tg["id"])
        result = db.claim_weekly_extra(uid, body.task_key, _iso_week())
        if result.get("ok"):
            invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/tasks/claim_achievement")
    def claim_achievement(body: AchClaimBody):
        tg = get_user(body.init_data)
        uid = int(tg["id"])
        result = db.claim_achievement_tier(uid, body.quest_key, body.tier)
        if result.get("ok"):
            invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/tasks/claim_streak")
    def claim_streak(body: StreakClaimBody):
        tg = get_user(body.init_data)
        uid = int(tg["id"])
        result = db.claim_streak_day(uid, body.day_num)
        if result.get("ok"):
            invalidate(uid)
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
            result["streak"] = db.get_login_streak_status(uid)
        return result

    app.include_router(router)
