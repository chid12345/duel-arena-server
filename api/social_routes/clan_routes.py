"""Клановые эндпоинты (выделено из referral_clan.py)."""

from __future__ import annotations

import logging
from html import escape as html_escape
from typing import Any, Dict

from fastapi import APIRouter

from api.social_routes.models import (
    ClanChatSendBody,
    ClanCreateBody,
    ClanDisbandBody,
    ClanJoinBody,
    ClanJoinReqBody,
    ClanJoinReqDecideBody,
    ClanKickBody,
    ClanLeaveBody,
    ClanMetaBody,
    ClanTransferBody,
)
from api.tma_player_api import _player_api

logger = logging.getLogger(__name__)


def attach_social_clan(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _rl_check = ctx["_rl_check"]
    _send_tg_message = ctx.get("_send_tg_message")

    @router.get("/api/clan")
    async def get_clan(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        player = db.get_or_create_player(uid, "")
        clan_id = player.get("clan_id")
        if not clan_id:
            return {"ok": True, "clan": None, "is_leader": False}
        try: db.heal_clan_leadership(int(clan_id))
        except Exception as exc: logger.warning("heal_clan_leadership failed: %s", exc)
        info = db.get_clan_info(int(clan_id))
        if not info:
            try: db.clear_orphan_clan_link(uid)
            except Exception: pass
            return {"ok": True, "clan": None, "is_leader": False}
        is_leader = info["clan"].get("leader_id") == uid
        username = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
        pending_requests = 0
        if is_leader:
            try: pending_requests = len(db.list_join_requests(uid))
            except Exception: pass
        return {
            "ok": True, "clan": info["clan"], "members": info["members"],
            "is_leader": is_leader, "my_user_id": uid, "my_username": username,
            "pending_requests": pending_requests,
        }

    @router.get("/api/clan/top")
    async def clan_top():
        return {"ok": True, "clans": db.top_clans(limit=20)}

    @router.get("/api/clan/search")
    async def clan_search(q: str = "", init_data: str = ""):
        results = db.search_clans(q.strip(), limit=10)
        ids = {int(r["id"]) for r in results}
        if ids:
            top = {int(c["id"]): c for c in db.top_clans(limit=200)}
            for r in results:
                ext = top.get(int(r["id"]))
                if ext:
                    r["emblem"] = ext.get("emblem", "neutral")
                    r["online_count"] = ext.get("online_count", 0)
                    r["weekly_wins"] = ext.get("weekly_wins", 0)
                    r["closed"] = ext.get("closed", 0)
                    r["description"] = ext.get("description", "")
                else:
                    r.update({"emblem": "neutral", "online_count": 0,
                              "weekly_wins": 0, "closed": 0, "description": ""})
        return {"ok": True, "clans": results}

    @router.get("/api/clan/preview")
    async def clan_preview(clan_id: int, init_data: str = ""):
        info = db.preview_clan(int(clan_id))
        if not info:
            return {"ok": False, "reason": "Клан не найден"}
        my_clan = None
        my_pending_request = False
        try:
            tg_user = get_user_from_init_data(init_data) if init_data else None
            if tg_user:
                uid = int(tg_user["id"])
                p = db.get_or_create_player(uid, "")
                my_clan = p.get("clan_id")
                # Проверяем есть ли уже pending-заявка от этого игрока
                try:
                    conn = db.get_connection()
                    try:
                        cursor = conn.cursor()
                        cursor.execute(
                            "SELECT id FROM clan_join_requests "
                            "WHERE clan_id = ? AND user_id = ? AND status = 'pending'",
                            (int(clan_id), uid),
                        )
                        my_pending_request = cursor.fetchone() is not None
                    finally:
                        conn.close()
                except Exception:
                    pass
        except Exception:
            my_clan = None
        return {"ok": True, "clan": info["clan"], "members": info["members"],
                "online_count": info["online_count"], "my_clan_id": my_clan,
                "my_pending_request": my_pending_request}

    @router.post("/api/clan/create")
    async def clan_create(body: ClanCreateBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.create_clan(
            uid, body.name.strip(), body.tag.strip(),
            emblem=body.emblem, description=body.description,
            min_level=body.min_level, closed=body.closed,
        )
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/clan/join")
    async def clan_join(body: ClanJoinBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.join_clan(uid, body.clan_id)
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/clan/leave")
    async def clan_leave(body: ClanLeaveBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.leave_clan(uid)
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.get("/api/clan/chat")
    async def get_clan_chat(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        player = db.get_or_create_player(uid, "")
        clan_id = player.get("clan_id")
        if not clan_id:
            return {"ok": False, "reason": "not_in_clan"}
        return {"ok": True, "messages": db.get_clan_messages(int(clan_id), limit=40)}

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
        return db.transfer_clan_leader(int(tg_user["id"]), body.new_leader_id)

    @router.post("/api/clan/kick")
    async def clan_kick_member(body: ClanKickBody):
        tg_user = get_user_from_init_data(body.init_data)
        return db.kick_clan_member(int(tg_user["id"]), body.target_user_id)

    @router.post("/api/clan/disband")
    async def clan_disband(body: ClanDisbandBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.disband_clan(uid)
        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/clan/request_join")
    async def clan_request_join(body: ClanJoinReqBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.submit_join_request(uid, int(body.clan_id))
        if result.get("ok") and _send_tg_message:
            try:
                conn = db.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT leader_id FROM clans WHERE id = ?", (int(body.clan_id),))
                row = cursor.fetchone()
                conn.close()
                if row:
                    leader_id = (row.get("leader_id") if hasattr(row, "get") else row[0])
                    if leader_id and int(leader_id) != uid:
                        uname = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
                        await _send_tg_message(
                            int(leader_id),
                            f"📨 <b>Новая заявка в клан!</b>\n"
                            f"Игрок <b>{html_escape(str(uname))}</b> хочет вступить.\n"
                            f"Откройте «Клан → Заявки» чтобы принять или отклонить.\n\n⚔️ Duel Arena",
                        )
            except Exception as exc:
                logger.warning("clan request notify failed: %s", exc)
        return result

    @router.get("/api/clan/requests")
    async def clan_requests(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        return {"ok": True, "requests": db.list_join_requests(int(tg_user["id"]))}

    @router.post("/api/clan/request_accept")
    async def clan_request_accept(body: ClanJoinReqDecideBody):
        tg_user = get_user_from_init_data(body.init_data)
        return db.accept_join_request(int(tg_user["id"]), int(body.request_id))

    @router.post("/api/clan/request_reject")
    async def clan_request_reject(body: ClanJoinReqDecideBody):
        tg_user = get_user_from_init_data(body.init_data)
        return db.reject_join_request(int(tg_user["id"]), int(body.request_id))

    @router.post("/api/clan/meta")
    async def clan_meta(body: ClanMetaBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        fields = {}
        if body.description is not None: fields["description"] = body.description
        if body.emblem is not None:      fields["emblem"] = body.emblem
        if body.min_level is not None:   fields["min_level"] = body.min_level
        if body.closed is not None:      fields["closed"] = body.closed
        if not fields:
            return {"ok": False, "reason": "Нечего обновлять"}
        return db.update_clan_meta(uid, **fields)
