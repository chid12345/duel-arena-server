"""Команда /buy и обработчики Telegram Stars."""

import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram import Update

from database import db
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


# Stars-payload префикс → слот в player_equipment.
# Именно таким payload сервер создаёт createInvoiceLink (см. api/*_payment_routes.py).
# Шлем исторически лежит в слоте "belt" (см. crypto_check.py, helmet_html_overlay.js).
_STARS_EQUIP_SLOT = {
    "weapon_equip_stars": "weapon",
    "shield_equip_stars": "shield",
    "helmet_equip_stars": "belt",
    "boots_equip_stars":  "boots",
    "ring_equip_stars":   "ring1",
}


def _parse_stars_equip_payload(payload: str):
    """Парсит `{type}_equip_stars:{uid}:{item_id}` → (slot, item_id) | None."""
    for prefix, slot in _STARS_EQUIP_SLOT.items():
        if payload.startswith(prefix + ":"):
            parts = payload.split(":", 2)
            if len(parts) == 3 and parts[2]:
                return slot, parts[2]
            break
    return None


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

            prem_result = db.activate_premium(user.id, days=21)
            bonus_d = prem_result.get("bonus_diamonds", 0)
            days_left = prem_result.get("days_left", 21)
            is_renewal = bonus_d == 0  # при первой активации даётся 1000 алмазов

            try:
                ref = db.process_referral_stars_premium(user.id, stars)
            except Exception as _ref_exc:
                logger.error("process_referral_stars_premium bot error uid=%s: %s", user.id, _ref_exc)
                ref = {}

            xp_line = f"\n📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>"
            if is_renewal:
                msg = f"✅ <b>Подписка продлена!</b> Срок: <b>{days_left} дн.</b>{xp_line}"
            else:
                bonus_txt = f"\n💎 Бонус: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
                msg = f"✅ <b>Premium активирован!</b> Срок: <b>{days_left} дн.</b>{bonus_txt}{xp_line}"
            await tg_api_call(update.message.reply_text, msg, parse_mode="HTML")

            from handlers.commands import BotHandlers

            await BotHandlers.notify_referrer_stars_payment(
                context.bot, user.id, payload, 0, stars, ref or {}
            )
            return

        # Мифическое снаряжение за Stars (weapon / shield / helmet / boots / ring).
        # Критично: выдаём предмет ИМЕННО здесь, не полагаясь на callback openInvoice
        # в mini app. Если Telegram свернул mini app на момент оплаты — callback не
        # сработает, и пользователь остался бы без покупки (и думал бы что "игра закрылась").
        eq_parse = _parse_stars_equip_payload(payload)
        if eq_parse:
            slot, item_id = eq_parse
            try:
                db.equip_item(user.id, slot, item_id)
                db.add_owned_weapon(user.id, item_id)
                msg = (
                    "✅ <b>Мифический предмет получен и надет!</b>\n"
                    "Откройте игру — увидите его в снаряжении.\n\n⚔️ Duel Arena"
                )
            except Exception as _e:
                logger.error(
                    "CRITICAL: Stars equip failed uid=%s slot=%s item=%s stars=%s err=%s",
                    user.id, slot, item_id, stars, _e,
                )
                msg = (
                    "⚠️ Оплата получена, но выдача предмета задержалась.\n"
                    "Напишите в поддержку и укажите Telegram ID. ⚔️ Duel Arena"
                )
            await tg_api_call(update.message.reply_text, msg, parse_mode="HTML")
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
                        try:
                            db.process_referral_vip_shop_purchase(user.id, stars=stars)
                        except Exception as _ve:
                            logger.error("vip_shop avatar stars uid=%s: %s", user.id, _ve)
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
            # Stars-свиток, ящик или другие Stars-покупки
            try:
                db.process_referral_vip_shop_purchase(user.id, stars=stars)
            except Exception as _ve:
                logger.error("vip_shop other stars uid=%s: %s", user.id, _ve)
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
