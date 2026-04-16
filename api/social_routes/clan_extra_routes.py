"""Доп-эндпоинты клана: сезон, достижения, история."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter


def attach_social_clan_extra(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]

    @router.get("/api/clan/season")
    async def clan_season_info():
        season = db.ensure_active_season()
        top = db.get_season_top(limit=10)
        return {"ok": True, "season": season, "top": top}

    @router.get("/api/clan/achievements")
    async def clan_achievements(init_data: str = "", clan_id: int = 0):
        # Если clan_id не передан — берём свой
        cid = int(clan_id or 0)
        if not cid and init_data:
            try:
                tg_user = get_user_from_init_data(init_data)
                p = db.get_or_create_player(int(tg_user["id"]), "")
                cid = int(p.get("clan_id") or 0)
            except Exception:
                cid = 0
        if not cid:
            return {"ok": False, "reason": "no clan"}
        return {"ok": True, "achievements": db.get_clan_achievements(cid)}

    @router.get("/api/clan/history")
    async def clan_history(init_data: str = "", clan_id: int = 0, limit: int = 30):
        cid = int(clan_id or 0)
        if not cid and init_data:
            try:
                tg_user = get_user_from_init_data(init_data)
                p = db.get_or_create_player(int(tg_user["id"]), "")
                cid = int(p.get("clan_id") or 0)
            except Exception:
                cid = 0
        if not cid:
            return {"ok": False, "reason": "no clan"}
        return {"ok": True, "events": db.get_clan_history(cid, limit=int(limit))}
