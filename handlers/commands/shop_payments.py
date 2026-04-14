"""Команда /buy и обработчики Telegram Stars."""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram import Update

from database import db
from handlers.common import tg_api_call


class BotHandlersShopPayments:
    @staticmethod
    async def buy_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /buy — купить алмазы за Telegram Stars."""
        from config import PREMIUM_SUBSCRIPTION_STARS, PREMIUM_XP_BONUS_PERCENT

        packages = [
            ("100 💎 алмазов", 100, 150),
            ("300 💎 алмазов", 300, 390),
            ("500 💎 алмазов", 500, 650),
        ]
        text = (
            "💎 <b>Магазин Telegram Stars</b>\n\n"
            f"👑 <b>Premium подписка</b> — {PREMIUM_SUBSCRIPTION_STARS} ⭐\n"
            f"• Опыт за бои: +{PREMIUM_XP_BONUS_PERCENT}%\n\n"
            "<b>Алмазы:</b>\n"
        )
        keyboard = [
            [
                InlineKeyboardButton(
                    f"👑 Premium · {PREMIUM_SUBSCRIPTION_STARS}⭐",
                    callback_data="stars_buy_premium",
                )
            ],
        ]
        for title, diamonds, stars in packages:
            text += f"• {title} — {stars} ⭐\n"
            keyboard.append(
                [InlineKeyboardButton(f"{title} · {stars}⭐", callback_data=f"stars_buy_{diamonds}_{stars}")]
            )
        keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")])
        await tg_api_call(
            update.message.reply_text,
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="HTML",
        )

    @staticmethod
    async def pre_checkout_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Telegram Stars: подтверждение оплаты."""
        query = update.pre_checkout_query
        await query.answer(ok=True)

    @staticmethod
    async def successful_payment_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Telegram Stars: успешная оплата — алмазы, подписка Premium, реферальные начисления."""
        payment = update.message.successful_payment
        payload = (payment.invoice_payload or "").strip()
        user = update.effective_user
        stars = int(payment.total_amount or 0)

        if payload == "premium_sub":
            from config import PREMIUM_XP_BONUS_PERCENT

            ref = db.process_referral_first_premium(user.id, stars)
            if ref.get("ok"):
                xp_line = f"\n📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>"
                msg = f"✅ <b>Premium активирован!</b> Спасибо за поддержку.{xp_line}"
                if ref.get("renewal"):
                    msg = f"✅ <b>Подписка продлена.</b> Спасибо!{xp_line}"
                await tg_api_call(update.message.reply_text, msg, parse_mode="HTML")
            from handlers.commands import BotHandlers

            await BotHandlers.notify_referrer_stars_payment(
                context.bot, user.id, payload, 0, stars, ref or {}
            )
            return

        if payload.startswith("avatar_"):
            avatar_id = payload[len("avatar_"):]
            import logging as _log
            _bot_log = _log.getLogger(__name__)
            try:
                unlock = db.unlock_avatar(user.id, avatar_id, source="stars")
                if unlock.get("ok"):
                    if not unlock.get("already_unlocked"):
                        db.track_purchase(user.id, avatar_id, "stars", stars)
                    if unlock.get("already_unlocked"):
                        msg = "✅ Оплата подтверждена! Этот образ уже есть у вас. ⚔️ Duel Arena"
                    else:
                        msg = "✅ <b>Образ получен!</b> Откройте «Аватары» в игре и наденьте его. ⚔️ Duel Arena"
                else:
                    # КРИТИЧНО: деньги списаны, но образ не выдан — логируем для ручного разбора
                    _bot_log.error(
                        "CRITICAL avatar not unlocked after Stars payment uid=%s avatar=%s reason=%s stars=%s",
                        user.id, avatar_id, unlock.get("reason"), stars,
                    )
                    msg = "⚠️ Оплата получена, но выдача образа задержалась. Напишите в поддержку, укажите свой Telegram ID. ⚔️ Duel Arena"
            except Exception as _e:
                _bot_log.error("avatar unlock EXCEPTION uid=%s avatar=%s: %s", user.id, avatar_id, _e, exc_info=True)
                msg = "⚠️ Оплата получена, но выдача образа задержалась. Напишите в поддержку, укажите свой Telegram ID. ⚔️ Duel Arena"
            await tg_api_call(update.message.reply_text, msg, parse_mode="HTML")
            return

        if not payload.startswith("diamonds_"):
            await tg_api_call(
                update.message.reply_text,
                "✅ Оплата получена. Если начисление не пришло — напишите в поддержку.",
            )
            return
        try:
            diamonds = int(payload.split("_")[1])
        except Exception:
            diamonds = 0
        if diamonds <= 0:
            return
        package_id = f"d{diamonds}"
        result = db.confirm_stars_payment(user.id, package_id, diamonds, stars)
        ref = db.process_referral_vip_shop_purchase(user.id, stars=stars)
        if result.get("ok"):
            await tg_api_call(
                update.message.reply_text,
                f"✅ Оплата прошла! +{diamonds} 💎 начислено. Спасибо!",
            )
        else:
            await tg_api_call(
                update.message.reply_text,
                f"✅ Оплата подтверждена! +{diamonds} 💎 уже на счету. Спасибо!",
            )
        from handlers.commands import BotHandlers

        await BotHandlers.notify_referrer_stars_payment(
            context.bot, user.id, payload, diamonds, stars, ref or {}
        )
