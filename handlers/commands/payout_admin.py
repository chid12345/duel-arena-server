"""Команды владельца для ручных реферальных выплат (только ADMIN_USER_IDS).

/payouts            — список заявок «ожидает»
/payout_done <id>   — пометить выплаченной (после перевода через @CryptoBot)
/payout_reject <id> — отклонить и вернуть деньги игроку
"""

import logging

from telegram import Update
from telegram.ext import ContextTypes

from config import ADMIN_USER_IDS
from database import db
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


class BotHandlersPayoutAdmin:
    @staticmethod
    async def payouts_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Только для администратора.")
            return
        rows = db.list_pending_withdrawals()
        if not rows:
            await tg_api_call(update.message.reply_text, "✅ Заявок на вывод нет.")
            return
        lines = ["💸 <b>Заявки на вывод</b>\n"]
        for r in rows:
            uname = f"@{r['username']}" if r["username"] else f"id {r['user_id']}"
            lines.append(
                f"#{r['id']} · {uname} (id <code>{r['user_id']}</code>) · <b>{r['amount']:.2f} USDT</b>\n"
                f"  /payout_done {r['id']} · /payout_reject {r['id']}"
            )
        await tg_api_call(update.message.reply_text, "\n".join(lines), parse_mode="HTML")

    @staticmethod
    async def payout_done_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Только для администратора.")
            return
        args = context.args or []
        if not args or not args[0].isdigit():
            await tg_api_call(update.message.reply_text, "Использование: /payout_done <id>")
            return
        wid = int(args[0])
        res = db.mark_withdrawal_paid(wid)
        if not res.get("ok"):
            await tg_api_call(update.message.reply_text, f"❌ {res.get('reason', 'ошибка')}")
            return
        await tg_api_call(
            update.message.reply_text, f"✅ Заявка #{wid} закрыта ({res['amount']:.2f} USDT)."
        )
        try:
            await tg_api_call(
                context.bot.send_message,
                chat_id=res["user_id"],
                text=(
                    f"💸 <b>Вывод {res['amount']:.2f} USDT выполнен!</b>\n"
                    f"Деньги отправлены через @CryptoBot — проверьте бот.\n\n⚔️ Duel Arena"
                ),
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("notify player paid failed uid=%s: %s", res.get("user_id"), e)

    @staticmethod
    async def payout_reject_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Только для администратора.")
            return
        args = context.args or []
        if not args or not args[0].isdigit():
            await tg_api_call(update.message.reply_text, "Использование: /payout_reject <id>")
            return
        wid = int(args[0])
        res = db.reject_withdrawal(wid)
        if not res.get("ok"):
            await tg_api_call(update.message.reply_text, f"❌ {res.get('reason', 'ошибка')}")
            return
        await tg_api_call(
            update.message.reply_text,
            f"↩️ Заявка #{wid} отклонена, {res['amount']:.2f} USDT возвращены игроку.",
        )
        try:
            await tg_api_call(
                context.bot.send_message,
                chat_id=res["user_id"],
                text=(
                    f"↩️ <b>Заявка на вывод отклонена</b>\n"
                    f"{res['amount']:.2f} USDT возвращены на ваш реферальный баланс — можно попробовать снова.\n\n⚔️ Duel Arena"
                ),
                parse_mode="HTML",
            )
        except Exception as e:
            logger.warning("notify player reject failed uid=%s: %s", res.get("user_id"), e)
