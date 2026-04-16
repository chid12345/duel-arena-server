"""Доп-эндпоинты клана: сезон, достижения, история, войны."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from api.social_routes.models import ClanWarChallengeBody, ClanWarDecideBody


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

    @router.get("/api/clan/war")
    async def clan_war_info(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        p = db.get_or_create_player(int(tg_user["id"]), "")
        cid = int(p.get("clan_id") or 0)
        if not cid:
            return {"ok": False, "reason": "no clan"}
        return {"ok": True, "war": db.get_active_war_for_clan(cid), "my_clan_id": cid}

    @router.post("/api/clan/war/challenge")
    async def clan_war_challenge(body: ClanWarChallengeBody):
        tg_user = get_user_from_init_data(body.init_data)
        return db.challenge_clan_to_war(int(tg_user["id"]), int(body.target_clan_id))

    @router.post("/api/clan/war/accept")
    async def clan_war_accept(body: ClanWarDecideBody):
        tg_user = get_user_from_init_data(body.init_data)
        return db.accept_clan_war(int(tg_user["id"]), int(body.war_id))

    @router.post("/api/clan/war/decline")
    async def clan_war_decline(body: ClanWarDecideBody):
        tg_user = get_user_from_init_data(body.init_data)
        return db.decline_clan_war(int(tg_user["id"]), int(body.war_id))
