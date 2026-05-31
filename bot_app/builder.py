"""Сборка Telegram Application: builder + post_init."""
import logging
from telegram.ext import Application

from config import BOT_TOKEN
from bot_app.bot_menu import setup_bot_menu
from bot_app.error_handler import error_handler
from bot_app.handlers_registration import register_handlers
from jobs.registry import register_jobs

logger = logging.getLogger(__name__)


def _build_app(bot_count: int) -> Application:
    """Собрать и настроить Application (вызывается при каждом retry)."""

    async def post_init(application: Application):
        # Удаляем вебхук — иначе «другой getUpdates» при первом деплое
        await application.bot.delete_webhook(drop_pending_updates=True)
        await setup_bot_menu(application)
        from battle_system import battle_system
        battle_system.attach(application)
        register_jobs(application)

    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    register_handlers(app)
    app.add_error_handler(error_handler)
    return app
