"""Покупка premium-аватарок за Stars / USDT."""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from api.avatar_shop_routes.models import AvatarBody
from config import PREMIUM_AVATAR_IDS, PREMIUM_AVATAR_STARS, PREMIUM_AVATAR_USDT, AVATAR_CATALOG

logger = logging.getLogger(__name__)

_PREM_MAP = {a["id"]: a for a in AVATAR_CATALOG if a["id"] in PREMIUM_AVATAR_IDS}


def attach_avatar_premium(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]
    _rl_check = ctx["_rl_check"]
    BOT_TOKEN = ctx["BOT_TOKEN"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]

    @router.post("/api/avatars/premium/stars_invoice")
    async def prem_stars_invoice(body: AvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        aid = body.avatar_id.strip()
        if aid not in _PREM_MAP:
            return {"ok": False, "reason": "Образ не найден в premium-каталоге"}
        st = db.get_player_avatar_state(uid)
        if st.get("ok"):
            for av in st.get("avatars", []):
                if av.get("id") == aid and av.get("unlocked"):
                    return {"ok": False, "reason": "Образ уже куплен"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}
        avatar = _PREM_MAP[aid]
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                    json={
                        "title": avatar["name"],
                        "description": f"Премиум образ: {avatar['description']}",
                        "payload": f"avatar_{aid}",
                        "currency": "XTR",
                        "prices": [{"label": avatar["name"], "amount": int(PREMIUM_AVATAR_STARS)}],
                    },
                )
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"], "avatar_id": aid}
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("prem avatar stars invoice error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения с Telegram"}

    @router.post("/api/avatars/premium/stars_confirm")
    async def prem_stars_confirm(body: AvatarBody):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            aid = body.avatar_id.strip()
            logger.info("stars_confirm uid=%s avatar=%s", uid, aid)
            if aid not in _PREM_MAP:
                logger.warning("stars_confirm: avatar %s not in PREM_MAP", aid)
                return {"ok": False, "reason": "Образ не найден"}
            unlock = db.unlock_avatar(uid, aid, source="stars")
            logger.info("stars_confirm unlock result uid=%s avatar=%s: %s", uid, aid, unlock)
            if unlock.get("ok") and not unlock.get("already_unlocked"):
                db.track_purchase(uid, aid, "stars", int(PREMIUM_AVATAR_STARS))
            _cache_invalidate(uid)
            state = db.get_player_avatar_state(uid)
            player = db.get_or_create_player(uid, "")
            return {
                "ok": bool(unlock.get("ok")),
                "already_unlocked": bool(unlock.get("already_unlocked")),
                "avatar_id": aid,
                "avatars": state.get("avatars", []),
                "player": _player_api(dict(player)),
            }
        except Exception as e:
            logger.error("stars_confirm FAILED uid=? avatar=%s: %s", body.avatar_id, e, exc_info=True)
            return {"ok": False, "reason": f"internal_error: {str(e)[:100]}"}

    @router.post("/api/avatars/premium/crypto_invoice")
    async def prem_crypto_invoice(body: AvatarBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        aid = body.avatar_id.strip()
        _rl_check(uid, "prem_avatar_crypto", max_hits=3, window_sec=30)
        if aid not in _PREM_MAP:
            return {"ok": False, "reason": "Образ не найден"}
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}
        st = db.get_player_avatar_state(uid)
        if st.get("ok"):
            for av in st.get("avatars", []):
                if av.get("id") == aid and av.get("unlocked"):
                    return {"ok": False, "reason": "Образ уже куплен"}
        avatar = _PREM_MAP[aid]
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{CRYPTOPAY_API_BASE}/createInvoice",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    json={
                        "asset": "USDT",
                        "amount": str(PREMIUM_AVATAR_USDT),
                        "payload": f"uid:{uid}:avatar:{aid}",
                        "description": f"Duel Arena — {avatar['name']}",
                        "allow_comments": False,
                        "allow_anonymous": False,
                    },
                )
                data = resp.json()
            if data.get("ok"):
                inv = data["result"]
                db.create_crypto_invoice(uid, inv["invoice_id"], 0, "USDT", str(PREMIUM_AVATAR_USDT), payload=f"uid:{uid}:avatar:{aid}")
                return {
                    "ok": True,
                    "invoice_url": inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url"),
                    "invoice_id": inv["invoice_id"],
                    "avatar_id": aid,
                }
            err = data.get("error") or {}
            return {"ok": False, "reason": f"CryptoPay [{err.get('code', '?')}]"}
        except Exception as e:
            return {"ok": False, "reason": f"Ошибка CryptoPay: {e}"}
