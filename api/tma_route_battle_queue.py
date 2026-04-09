"""Очередь PvP и персональные вызовы (TMA)."""

from __future__ import annotations

import logging
from typing import Any, Callable

from fastapi import FastAPI

from api.tma_infra import manager
from api.tma_models import ChallengeCancelBody, ChallengeRespondBody, ChallengeSendBody, InitDataHeader

logger = logging.getLogger(__name__)


def register_tma_battle_queue_routes(
    app: FastAPI,
    *,
    db: Any,
    battle_system: Any,
    get_user_from_init_data: Callable[[str], dict],
    _rl_check: Callable[..., None],
    _send_tg_message: Callable[..., Any],
    _battle_state_api: Callable[[int], dict | None],
    PLAYER_START_MAX_HP: int,
    HP_MIN_BATTLE_PCT: int,
) -> None:
    @app.post("/api/battle/queue")
    async def join_queue(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        player = db.get_or_create_player(uid, "")
        db.pvp_enqueue(uid, int(player.get("level", 1)), chat_id=0, message_id=None)
        return {"ok": True, "status": "queued"}

    @app.post("/api/battle/cancel_queue")
    async def cancel_queue(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        db.pvp_dequeue(uid)
        return {"ok": True}

    @app.post("/api/battle/challenge/send")
    async def send_challenge(body: ChallengeSendBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "challenge_send", max_hits=3, window_sec=30)
        my_username = tg_user.get("username") or tg_user.get("first_name") or f"User{uid}"
        me = db.get_or_create_player(uid, my_username)
        if battle_system.get_battle_status(uid):
            return {"ok": False, "reason": "already_in_battle"}

        mhp = int(me.get("max_hp", PLAYER_START_MAX_HP))
        chp = int(me.get("current_hp", mhp))
        min_hp = int(mhp * HP_MIN_BATTLE_PCT)
        if chp < min_hp:
            return {"ok": False, "reason": "low_hp"}

        candidates = db.search_players_by_username(body.nickname, limit=5)
        if not candidates:
            return {"ok": False, "reason": "target_not_found"}
        norm = (body.nickname or "").strip().lstrip("@").lower()
        exact = next((c for c in candidates if (c.get("username") or "").lower() == norm), None)
        target = exact or (candidates[0] if len(candidates) == 1 else None)
        if target is None:
            return {
                "ok": False,
                "reason": "multiple_candidates",
                "candidates": [
                    {
                        "user_id": int(c["user_id"]),
                        "username": c.get("username") or f"User{c['user_id']}",
                        "level": int(c.get("level") or 1),
                        "rating": int(c.get("rating") or 1000),
                    }
                    for c in candidates
                ],
            }
        target_uid = int(target["user_id"])
        if target_uid == uid:
            return {"ok": False, "reason": "cannot_challenge_self"}
        if not manager.is_online(target_uid):
            return {"ok": False, "reason": "target_offline"}
        if battle_system.get_battle_status(target_uid):
            return {"ok": False, "reason": "target_busy"}

        target_mhp = int(target.get("max_hp", PLAYER_START_MAX_HP))
        target_chp = int(target.get("current_hp", target_mhp))
        if target_chp < int(target_mhp * HP_MIN_BATTLE_PCT):
            return {"ok": False, "reason": "target_low_hp"}

        ch = db.create_pvp_challenge(uid, target_uid, ttl_seconds=300)
        if not ch.get("ok"):
            return {"ok": False, "reason": ch.get("reason", "challenge_failed")}

        await manager.send(
            target_uid,
            {
                "event": "challenge_incoming",
                "challenge": {
                    "id": ch["challenge_id"],
                    "from_user_id": uid,
                    "from_username": me.get("username") or my_username,
                    "from_level": int(me.get("level", 1)),
                    "from_rating": int(me.get("rating", 1000)),
                    "expires_at": ch["expires_at"],
                },
            },
        )
        try:
            target_chat_id = db.get_player_chat_id(target_uid)
            if target_chat_id:
                chall_name = me.get("username") or my_username
                await _send_tg_message(
                    int(target_chat_id),
                    (
                        "⚔️ <b>Новый PvP-вызов</b>\n\n"
                        f"Игрок @{chall_name} бросил тебе вызов.\n"
                        "Открой мини-приложение и прими/отклони."
                    ),
                )
        except Exception as e:
            logger.warning("challenge tg notify failed: %s", e)
        return {"ok": True, "status": "challenge_sent", "challenge_id": ch["challenge_id"], "expires_at": ch["expires_at"]}

    @app.get("/api/battle/challenge/pending")
    async def pending_challenge(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        row = db.get_incoming_pvp_challenge(uid)
        if not row:
            return {"ok": True, "pending": False}
        return {
            "ok": True,
            "pending": True,
            "challenge": {
                "id": int(row["id"]),
                "from_user_id": int(row["challenger_id"]),
                "from_username": row.get("challenger_username") or "Боец",
                "from_level": int(row.get("challenger_level") or 1),
                "from_rating": int(row.get("challenger_rating") or 1000),
                "expires_at": int(row.get("expires_at") or 0),
            },
        }

    @app.get("/api/battle/challenge/outgoing")
    async def outgoing_challenges(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        rows = db.get_outgoing_pvp_challenges(uid, limit=12)
        return {"ok": True, "challenges": rows}

    @app.post("/api/battle/challenge/cancel")
    async def cancel_challenge(body: ChallengeCancelBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok = db.cancel_pvp_challenge(body.challenge_id, uid)
        return {"ok": bool(ok)}

    @app.post("/api/battle/challenge/respond")
    async def respond_challenge(body: ChallengeRespondBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        resp = db.respond_pvp_challenge(int(body.challenge_id), uid, bool(body.accept))
        if not resp:
            return {"ok": False, "reason": "challenge_not_found_or_expired"}

        challenger_id = int(resp["challenger_id"])
        target_id = int(resp["target_id"])
        if not body.accept:
            await manager.send(challenger_id, {"event": "challenge_declined", "by_user_id": target_id})
            return {"ok": True, "status": "declined"}

        if battle_system.get_battle_status(challenger_id) or battle_system.get_battle_status(target_id):
            return {"ok": False, "reason": "already_in_battle"}
        if not manager.is_online(challenger_id):
            return {"ok": False, "reason": "challenger_offline"}

        ch_player = db.get_or_create_player(challenger_id, "")
        tg_player = db.get_or_create_player(target_id, tg_user.get("username") or tg_user.get("first_name") or "")
        db.pvp_dequeue(challenger_id)
        db.pvp_dequeue(target_id)

        bid = await battle_system.start_battle(ch_player, tg_player, is_bot2=False)
        b = battle_system.active_battles.get(bid)
        if b:
            b["_tma_p1"] = True
        await manager.send(challenger_id, {"event": "battle_started", "battle": _battle_state_api(challenger_id)})
        return {"ok": True, "status": "accepted", "battle": _battle_state_api(target_id)}
