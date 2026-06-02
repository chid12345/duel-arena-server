"""Команда /start — минимальный экран: киберпанк-баннер + описание + 1 кнопка.

Все игровые функции (бой, магазин, клан, рейтинг, статы) — внутри Mini App,
в Telegram-чате не дублируются. Это решение для единого UX: один тап → игра.
HP-реген, ежедневный бонус, итог боя, активный бой — обрабатываются
на стороне Mini App при входе (через /api/player/active_session и др).
"""

import asyncio
import io
import logging
import os

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from telegram import Update

from config import *
from database import db
from handlers.common import RateLimiter

logger = logging.getLogger(__name__)


WELCOME_TEXT = (
    "⚡ <b>DUEL ARENA</b> ⚡\n"
    "━━━━━━━━━━━━━━━━━━\n\n"
    "▸ Место, где сражаются <b>тысячи бойцов</b>.\n"
    "▸ Дуэли · Кланы · Мировые боссы · Рейтинг.\n\n"
    "Жми <b>«⚡ ВОЙТИ В АРЕНУ»</b> — попадёшь в первый бой."
)

# Киберпанк-баннер с воинами — тот же что и BotFather description picture.
# Загружается в память один раз при импорте модуля → потом каждый /start
# отсылается мгновенно (Telegram сам кэширует фото по content-hash).
_BANNER_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "webapp", "bot_description.png")
)
try:
    with open(_BANNER_PATH, "rb") as _f:
        _BANNER_BYTES: bytes | None = _f.read()
    logger.info("✅ /start баннер загружен (%d КБ)", len(_BANNER_BYTES) // 1024)
except Exception as _exc:
    _BANNER_BYTES = None
    logger.warning("⚠️ /start баннер не загружен (%s) — fallback на text-only", _exc)


def _build_arena_keyboard() -> InlineKeyboardMarkup | None:
    """Одна кнопка web_app → Mini App. None если WEBAPP_PUBLIC_URL пуст."""
    if not WEBAPP_PUBLIC_URL:
        return None
    return InlineKeyboardMarkup([[
        InlineKeyboardButton(
            "⚡ ВОЙТИ В АРЕНУ",
            web_app=WebAppInfo(url=WEBAPP_PUBLIC_URL),
        )
    ]])


async def _process_referral(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Реферальная атрибуция + reconcile premium-комиссии."""
    if not context.args:
        return
    ref_code = context.args[0]
    if not ref_code.startswith("ref_"):
        return
    user = update.effective_user
    try:
        ok_ref, referrer_uid = db.register_referral(user.id, ref_code)
        logger.info(
            "event=register_referral user_id=%s ref_code=%s ok=%s referrer=%s",
            user.id, ref_code, ok_ref, referrer_uid,
        )
        if ok_ref and referrer_uid is not None:
            from handlers.commands import BotHandlers
            await BotHandlers.notify_referrer_join(context.bot, referrer_uid, user)
            try:
                ref_pay = await asyncio.to_thread(db.reconcile_premium_referral, user.id)
                if ref_pay.get("ok") and ref_pay.get("reward_usdt"):
                    await BotHandlers.notify_referrer_premium_reward(context.bot, ref_pay)
            except Exception as _rec_exc:
                logger.error("reconcile_premium_referral error uid=%s: %s", user.id, _rec_exc)
    except Exception as _ref_exc:
        logger.error(
            "event=register_referral_error user_id=%s ref_code=%s error=%s",
            user.id, ref_code, _ref_exc,
        )


class BotHandlersStart:
    @staticmethod
    async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /start — единый минимальный экран для всех."""
        user = update.effective_user
        if not RateLimiter.is_allowed(user.id, "command_start", 1.0):
            await update.message.reply_text("⏳ Слишком часто. Подождите немного.")
            return
        logger.info("event=command_start user_id=%s", user.id)
        db.log_metric_event("command_start", user.id)

        # Гарантируем что строка игрока в БД создана (нужно для реферера, статов).
        await asyncio.to_thread(db.get_or_create_player, user.id, user.username)

        if update.effective_chat:
            db.update_chat_id(user.id, update.effective_chat.id)

        await _process_referral(update, context)

        kbd = _build_arena_keyboard()
        # С баннером сообщение визуально крупнее в 5x — фото шириной с чат,
        # текст под фото, кнопка под текстом такой же ширины. Без баннера —
        # обычный text-only fallback (баннер мог не загрузиться).
        if _BANNER_BYTES is not None:
            await update.message.reply_photo(
                photo=io.BytesIO(_BANNER_BYTES),
                caption=WELCOME_TEXT,
                reply_markup=kbd,
                parse_mode="HTML",
            )
        else:
            await update.message.reply_text(
                WELCOME_TEXT,
                reply_markup=kbd,
                parse_mode="HTML",
            )
