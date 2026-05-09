"""Команда /pass — открыть страницу боевого пропуска в Mini App."""

import logging

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
    WebAppInfo,
)
from telegram.ext import ContextTypes

from config.env_and_urls import WEBAPP_PUBLIC_URL
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


def _pass_url() -> str:
    if not WEBAPP_PUBLIC_URL:
        return ""
    base = WEBAPP_PUBLIC_URL.split("?")[0].rstrip("/")
    return f"{base}/season_pass.html"


class BotHandlersBattlePass:
    @staticmethod
    async def battle_pass_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /pass (и /battle_pass) — открыть страницу боевого пропуска."""
        user = update.effective_user
        url = _pass_url()
        if not url:
            await tg_api_call(
                update.message.reply_text,
                "⚠ WEBAPP_PUBLIC_URL не настроен. Открыть пасс невозможно.",
            )
            return

        text = (
            "🏆 <b>Боевой пропуск</b>\n\n"
            "• 50 уровней наград\n"
            "• Free-трек: открыт всем\n"
            "• Premium-трек: за подписку (390 ⭐ / 4.99 USDT)\n\n"
            "Очки начисляются за бои, квесты, рейды.\n"
            "Жми кнопку — откроется в Telegram WebApp."
        )

        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton(
                "🏆 Открыть пропуск",
                web_app=WebAppInfo(url=url),
            )
        ]])

        await tg_api_call(
            update.message.reply_text,
            text,
            reply_markup=keyboard,
            parse_mode="HTML",
        )
        logger.info("battle_pass: открыта страница uid=%s", user.id)
