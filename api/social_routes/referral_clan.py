"""Рефералка и клан (без вывода USDT)."""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from api.social_routes.models import (
    ClanChatSendBody,
    ClanCreateBody,
    ClanJoinBody,
    ClanLeaveBody,
    ClanTransferBody,
)

logger = logging.getLogger(__name__)


def attach_social_referral_clan(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _rl_check = ctx["_rl_check"]

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

    @router.get("/api/clan")
    async def get_clan(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        player = db.get_or_create_player(uid, "")
        clan_id = player.get("clan_id")
        if not clan_id:
            return {"ok": True, "clan": None, "is_leader": False}
        info = db.get_clan_info(int(clan_id))
        if not info:
            return {"ok": True, "clan": None, "is_leader": False}
        is_leader = info["clan"].get("leader_id") == uid
        username = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
        return {"ok": True, "clan": info["clan"], "members": info["members"], "is_leader": is_leader, "my_user_id": uid, "my_username": username}

    @router.get("/api/clan/top")
    async def clan_top():
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT c.id, c.name, c.tag, c.level, c.wins,
                      (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
               FROM clans c ORDER BY c.wins DESC, member_count DESC LIMIT 20"""
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return {"ok": True, "clans": rows}

    @router.get("/api/clan/search")
    async def clan_search(q: str = "", init_data: str = ""):
        results = db.search_clans(q.strip(), limit=10)
        return {"ok": True, "clans": results}

    @router.post("/api/clan/create")
    async def clan_create(body: ClanCreateBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.create_clan(uid, body.name.strip(), body.tag.strip())
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = dict(player)
        return result

    @router.post("/api/clan/join")
    async def clan_join(body: ClanJoinBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.join_clan(uid, body.clan_id)
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = dict(player)
        return result

    @router.post("/api/clan/leave")
    async def clan_leave(body: ClanLeaveBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.leave_clan(uid)
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = dict(player)
        return result

    @router.get("/api/clan/chat")
    async def get_clan_chat(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        player = db.get_or_create_player(uid, "")
        clan_id = player.get("clan_id")
        if not clan_id:
            return {"ok": False, "reason": "not_in_clan"}
        messages = db.get_clan_messages(int(clan_id), limit=40)
        return {"ok": True, "messages": messages}

    @router.post("/api/clan/chat/send")
    async def send_clan_chat(body: ClanChatSendBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "clan_chat", max_hits=5, window_sec=10)
        username = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
        player = db.get_or_create_player(uid, username)
        clan_id = player.get("clan_id")
        if not clan_id:
            return {"ok": False, "reason": "not_in_clan"}
        ok = db.send_clan_message(int(clan_id), uid, username, body.message)
        return {"ok": ok, "reason": "empty" if not ok else None}

    @router.post("/api/clan/transfer_leader")
    async def clan_transfer_leader(body: ClanTransferBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        return db.transfer_clan_leader(uid, body.new_leader_id)
