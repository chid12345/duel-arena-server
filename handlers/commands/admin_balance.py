"""Команда /admin — кнопка для открытия админ-панели балансной сетки."""

import logging

from telegram import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Update,
    WebAppInfo,
)
from telegram.ext import ContextTypes

from config import ADMIN_USER_IDS
from config.env_and_urls import WEBAPP_PUBLIC_URL
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


def _panel_url() -> str:
    """https://<домен>/admin_balance.html (без ?v= параметров кэша)."""
    if not WEBAPP_PUBLIC_URL:
        return ""
    base = WEBAPP_PUBLIC_URL.split("?")[0].rstrip("/")
    return f"{base}/admin_balance.html"


class BotHandlersAdminBalance:
    @staticmethod
    async def admin_balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /admin (и /admin_balance) — открыть веб-панель балансной сетки."""
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(
                update.message.reply_text,
                "🚫 Команда доступна только администраторам.",
            )
            logger.info("admin_balance: отказ uid=%s (не в ADMIN_USER_IDS)", user.id)
            return

        url = _panel_url()
        if not url:
            await tg_api_call(
                update.message.reply_text,
                "⚠ WEBAPP_PUBLIC_URL не настроен. Открыть панель невозможно.\n"
                "Проверь env-переменную WEBAPP_PUBLIC_URL на хостинге.",
            )
            return

        text = (
            "🎛 <b>Админ-панель балансной сетки</b>\n\n"
            "• Анкер-числа (12 ползунков)\n"
            "• Множители price_factor (gold/diamond/star/usdt)\n"
            "• Аудит расхождений по 12 квестам\n"
            "• Аудит цен 56 предметов магазина\n\n"
            "Жми кнопку — откроется в Telegram WebApp."
        )

        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton(
                "🎛 Открыть панель",
                web_app=WebAppInfo(url=url),
            )
        ]])

        await tg_api_call(
            update.message.reply_text,
            text,
            reply_markup=keyboard,
            parse_mode="HTML",
        )
        logger.info("admin_balance: кнопка отправлена uid=%s url=%s", user.id, url)
