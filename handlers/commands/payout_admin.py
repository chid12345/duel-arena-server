"""Команды владельца для ручных реферальных выплат (только ADMIN_USER_IDS).

/payouts            — список заявок «ожидает»
/payout_done <id>   — пометить выплаченной (после перевода через @CryptoBot)
/payout_reject <id> — отклонить и вернуть деньги игроку
/reconcile_refs     — разово доначислить рефералам комиссию за Premium,
                      купленный ДО появления доплаты задним числом (идемпотентно)
"""

import asyncio
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

    @staticmethod
    async def reconcile_refs_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Разовый бэкафилл: доначислить рефереру за уже купленный реферой Premium."""
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Только для администратора.")
            return
        try:
            res = await asyncio.to_thread(db.reconcile_all_premium_referrals)
            brk = await asyncio.to_thread(db.referral_purchase_breakdown)
        except Exception as e:
            logger.exception("reconcile_refs failed")
            await tg_api_call(
                update.message.reply_text,
                f"⚠️ Ошибка бэкафилла: <code>{type(e).__name__}: {e}</code>",
                parse_mode="HTML",
            )
            return
        diag = (
            f"\n\n📊 Рефералов: <b>{brk['total_refs']}</b> · "
            f"купили Premium: <b>{brk['with_premium']}</b> · "
            f"купили алмазы за USDT: <b>{brk['with_diamond_usdt']}</b>"
        )
        credited = res.get("credited", [])
        if not credited:
            await tg_api_call(
                update.message.reply_text,
                "✅ Доначислять за Premium нечего (премиум-комиссии уже выплачены "
                "или рефералы Premium не покупали)." + diag +
                "\n\nℹ️ USDT-комиссия идёт за покупку <b>Premium</b>. За покупку "
                "<b>алмазов</b> платится только VIP-рефереру (с 31-го платящего).",
                parse_mode="HTML",
            )
            return
        # Уведомляем каждого реферера о доплате (через проверенный helper с chat_id).
        from handlers.commands import BotHandlers
        for c in credited:
            try:
                await BotHandlers.notify_referrer_premium_reward(context.bot, c)
            except Exception as e:
                logger.warning("reconcile notify failed referrer=%s: %s", c.get("referrer_id"), e)
        await tg_api_call(
            update.message.reply_text,
            f"✅ Доначислено комиссий: <b>{res['count']}</b> на сумму <b>{res['total_usdt']:.4f} USDT</b>.\n"
            "Рефереры уведомлены, баланс обновлён." + diag,
            parse_mode="HTML",
        )
