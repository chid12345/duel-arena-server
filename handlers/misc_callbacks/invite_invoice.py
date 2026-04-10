"""Реферальное приглашение и инвойсы Stars (патчи CallbackHandlers)."""

import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
from handlers.common import _referral_program_html
from database import db

logger = logging.getLogger(__name__)


async def show_invite_inline(query, player, context):
    db.get_or_create_player(player["user_id"], player.get("username", ""))
    ref_code = db.get_referral_code(player["user_id"])
    uid = player["user_id"]
    stats = db.get_referral_stats(uid)
    recent = db.get_recent_referrals(uid, limit=3)
    me = await context.bot.get_me()
    bot_username = me.username or ""
    text = _referral_program_html(bot_username, ref_code, stats, recent)
    keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]]
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.show_invite_inline = staticmethod(show_invite_inline)


async def send_stars_invoice(query, player, context, diamonds: int, stars: int):
    """Отправить инвойс для покупки алмазов через Telegram Stars."""
    from telegram import LabeledPrice

    try:
        await context.bot.send_invoice(
            chat_id=query.message.chat_id,
            title=f"{diamonds} 💎 алмазов",
            description=f"Покупка {diamonds} алмазов в Дуэль-Арене",
            payload=f"diamonds_{diamonds}",
            currency="XTR",
            prices=[LabeledPrice(label=f"{diamonds} алмазов", amount=stars)],
            provider_token="",
        )
        await query.answer()
    except Exception as e:
        logger.error("Stars invoice error: %s", e)
        await query.answer("❌ Ошибка создания платежа. Попробуйте позже.", show_alert=True)


CallbackHandlers.send_stars_invoice = staticmethod(send_stars_invoice)


async def send_premium_invoice(query, player, context):
    """Инвойс Premium подписки (Stars, payload premium_sub)."""
    from telegram import LabeledPrice
    from config import PREMIUM_SUBSCRIPTION_STARS

    stars = int(PREMIUM_SUBSCRIPTION_STARS)
    try:
        await context.bot.send_invoice(
            chat_id=query.message.chat_id,
            title="👑 Premium подписка",
            description="Дуэль-Арена: премиум-статус на период (разработка: бонусы будут расширены).",
            payload="premium_sub",
            currency="XTR",
            prices=[LabeledPrice(label="Premium подписка", amount=stars)],
            provider_token="",
        )
        await query.answer()
    except Exception as e:
        logger.error("Premium invoice error: %s", e)
        await query.answer("❌ Ошибка создания платежа. Попробуйте позже.", show_alert=True)


CallbackHandlers.send_premium_invoice = staticmethod(send_premium_invoice)
