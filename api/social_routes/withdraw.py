"""Вывод реферального USDT через CryptoPay."""

from __future__ import annotations

import logging
from datetime import datetime as _dt
from typing import Any, Dict

from fastapi import APIRouter

from api.social_routes.models import ReferralWithdrawBody

logger = logging.getLogger(__name__)


def attach_social_withdraw(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _send_tg_message = ctx["_send_tg_message"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]

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
