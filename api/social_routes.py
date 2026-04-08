from __future__ import annotations

import logging
from datetime import datetime as _dt
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ClanCreateBody(BaseModel):
    init_data: str
    name: str
    tag: str


class ClanJoinBody(BaseModel):
    init_data: str
    clan_id: int


class ClanLeaveBody(BaseModel):
    init_data: str


class ClanChatSendBody(BaseModel):
    init_data: str
    message: str


class ClanTransferBody(BaseModel):
    init_data: str
    new_leader_id: int


class ReferralWithdrawBody(BaseModel):
    init_data: str


def register_social_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _rl_check = ctx["_rl_check"]
    _send_tg_message = ctx["_send_tg_message"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]

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

    @router.post("/api/referral/withdraw")
    async def referral_withdraw(body: ReferralWithdrawBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        check = db.request_referral_withdrawal(uid)
        if not check.get("ok"):
            return check
        amount = check["amount"]
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен — обратитесь к администратору"}

        import httpx
        spend_id = f"ref_wd_{uid}_{int(_dt.utcnow().timestamp())}"
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{CRYPTOPAY_API_BASE}/transfer",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    json={
                        "user_id": uid,
                        "asset": "USDT",
                        "amount": f"{amount:.2f}",
                        "spend_id": spend_id,
                        "comment": "Duel Arena — реферальный бонус 💰",
                        "disable_send_notification": False,
                    },
                )
                data = resp.json()
            if data.get("ok"):
                db.confirm_referral_withdrawal(uid, amount)
                logger.info("Referral withdrawal sent: uid=%s amount=%.2f USDT", uid, amount)
                await _send_tg_message(uid, f"💸 <b>Вывод {amount:.2f} USDT выполнен!</b>\nСредства отправлены через @CryptoBot.\nСледующий вывод доступен через 24 часа.\n\n⚔️ Duel Arena")
                return {"ok": True, "amount": amount}
            err = data.get("error", {})
            code = err.get("code") or err.get("name") or ""
            logger.warning("CryptoPay transfer failed: uid=%s code=%s data=%s", uid, code, data)
            if "NOT_ENOUGH_COINS" in code or "not enough" in str(data).lower():
                return {"ok": False, "reason": "Недостаточно USDT на счёте бота — обратитесь к администратору"}
            if "USER_NOT_FOUND" in code or "user" in code.lower():
                return {"ok": False, "reason": "Сначала откройте @CryptoBot в Telegram (один раз), затем повторите", "cryptobot_required": True}
            return {"ok": False, "reason": f"Ошибка перевода: {code or 'неизвестно'}"}
        except Exception as e:
            logger.error("CryptoPay transfer error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения с CryptoPay"}

    app.include_router(router)
