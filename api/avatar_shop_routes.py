from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class AvatarBody(BaseModel):
    init_data: str
    avatar_id: str


class EliteAvatarBody(BaseModel):
    init_data: str


def register_avatar_shop_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()

    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]
    _rl_check = ctx["_rl_check"]
    ELITE_AVATAR_ID = ctx["ELITE_AVATAR_ID"]
    ELITE_AVATAR_STARS = ctx["ELITE_AVATAR_STARS"]
    ELITE_AVATAR_USDT = ctx["ELITE_AVATAR_USDT"]
    BOT_TOKEN = ctx["BOT_TOKEN"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]

    @router.get("/api/avatars")
    async def avatars(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        return db.get_player_avatar_state(uid)

    @router.post("/api/avatars/buy")
    async def avatars_buy(body: AvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.buy_avatar(uid, body.avatar_id.strip())
        if result.get("ok"):
            _cache_invalidate(uid)
            state = db.get_player_avatar_state(uid)
            player = db.get_or_create_player(uid, "")
            result["avatars"] = state.get("avatars", [])
            result["player"] = _player_api(dict(player))
        return result

    @router.post("/api/avatars/equip")
    async def avatars_equip(body: AvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        result = db.equip_avatar(uid, body.avatar_id.strip())
        if result.get("ok"):
            _cache_invalidate(uid)
            state = db.get_player_avatar_state(uid)
            player = db.get_or_create_player(uid, "")
            result["avatars"] = state.get("avatars", [])
            result["player"] = _player_api(dict(player))
        return result


    @router.post("/api/avatars/elite/stars_invoice")
    async def elite_avatar_stars_invoice(body: EliteAvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        st = db.get_player_avatar_state(uid)
        if st.get("ok"):
            for av in st.get("avatars", []):
                if av.get("id") == ELITE_AVATAR_ID and av.get("unlocked"):
                    return {"ok": False, "reason": "Элитный образ уже куплен"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен (нет BOT_TOKEN)"}
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink", json={"title": "👑 Элитный образ", "description": "Уникальный статусный образ для Duel Arena.", "payload": f"avatar_{ELITE_AVATAR_ID}", "currency": "XTR", "prices": [{"label": "Элитный образ", "amount": int(ELITE_AVATAR_STARS)}]})
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"], "avatar_id": ELITE_AVATAR_ID}
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("elite avatar stars invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения с Telegram"}

    @router.post("/api/avatars/elite/stars_confirm")
    async def elite_avatar_stars_confirm(body: EliteAvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        unlock = db.unlock_avatar(uid, ELITE_AVATAR_ID, source="stars")
        _cache_invalidate(uid)
        state = db.get_player_avatar_state(uid)
        player = db.get_or_create_player(uid, "")
        return {"ok": bool(unlock.get("ok")), "already_unlocked": bool(unlock.get("already_unlocked")), "avatar_id": ELITE_AVATAR_ID, "avatars": state.get("avatars", []), "player": _player_api(dict(player))}


    @router.post("/api/avatars/elite/crypto_invoice")
    async def elite_avatar_crypto_invoice(body: EliteAvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "elite_avatar_crypto_invoice", max_hits=3, window_sec=30)
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}
        st = db.get_player_avatar_state(uid)
        if st.get("ok"):
            for av in st.get("avatars", []):
                if av.get("id") == ELITE_AVATAR_ID and av.get("unlocked"):
                    return {"ok": False, "reason": "Элитный образ уже куплен"}
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(f"{CRYPTOPAY_API_BASE}/createInvoice", headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN}, json={"asset": "USDT", "amount": str(ELITE_AVATAR_USDT), "payload": f"uid:{uid}:avatar:{ELITE_AVATAR_ID}", "description": "Duel Arena — 👑 Элитный образ", "allow_comments": False, "allow_anonymous": False})
                data = resp.json()
            if data.get("ok"):
                inv = data["result"]
                db.create_crypto_invoice(uid, inv["invoice_id"], 0, "USDT", str(ELITE_AVATAR_USDT))
                return {"ok": True, "invoice_url": inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url"), "invoice_id": inv["invoice_id"], "avatar_id": ELITE_AVATAR_ID}
            err = data.get("error") or {}
            return {"ok": False, "reason": f"CryptoPay [{err.get('code', '?')}] {err.get('name', 'UNKNOWN')}"}
        except Exception as e:
            return {"ok": False, "reason": f"Ошибка соединения с CryptoPay: {e}"}

    app.include_router(router)
