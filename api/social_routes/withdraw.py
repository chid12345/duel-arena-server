"""Заявка на ручной вывод реферального USDT.

Деньги НЕ уходят автоматически: создаётся заявка, баланс сразу замораживается
(атомарный захват — фикс гонки двойного вывода), владельцу падает пинг в Telegram.
Выплата вручную через @CryptoBot + /payout_done <id>.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from config import ADMIN_USER_IDS
from api.social_routes.models import ReferralWithdrawBody

logger = logging.getLogger(__name__)


def attach_social_withdraw(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _send_tg_message = ctx["_send_tg_message"]

    @router.post("/api/referral/withdraw")
    async def referral_withdraw(body: ReferralWithdrawBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = (tg_user.get("username") or "").strip()
        res = db.request_referral_withdrawal(uid, username=username)
        if not res.get("ok"):
            return res
        amount = res["amount"]
        wid = res["withdrawal_id"]
        uname_txt = f"@{username}" if username else f"id {uid}"
        note = (
            f"💸 <b>Заявка на вывод #{wid}</b>\n"
            f"Игрок: {uname_txt} (id <code>{uid}</code>)\n"
            f"Сумма: <b>{amount:.2f} USDT</b>\n\n"
            f"1) Открой @CryptoBot → переведи {amount:.2f} USDT игроку\n"
            f"2) Подтверди: <code>/payout_done {wid}</code>\n"
            f"   (вернуть на баланс: <code>/payout_reject {wid}</code>)"
        )
        for admin_id in ADMIN_USER_IDS:
            try:
                await _send_tg_message(admin_id, note)
            except Exception as e:
                logger.warning("payout admin notify failed admin=%s: %s", admin_id, e)
        logger.info("Referral withdrawal requested: uid=%s amount=%.2f id=%s", uid, amount, wid)
        return {"ok": True, "pending": True, "amount": amount, "withdrawal_id": wid}
