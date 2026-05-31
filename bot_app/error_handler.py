"""Глобальный error-handler для Telegram."""
import logging
from telegram import Update
from telegram.error import Conflict as TelegramConflict

logger = logging.getLogger(__name__)


async def error_handler(update: object, context):
    """Глобальный обработчик ошибок Telegram."""
    # Conflict во время работы = конкурирующий инстанс (Render zero-downtime deploy).
    # Ставим флаг и останавливаем → while-loop в main() увидит флаг и сделает retry.
    if isinstance(context.error, TelegramConflict):
        logger.warning("⚠️ Conflict во время polling — останавливаю приложение для рестарта...")
        context.application.bot_data["__conflict_retry"] = True
        context.application.stop_running()
        return

    logger.exception("Unhandled error in update handling", exc_info=context.error)

    if isinstance(update, Update):
        try:
            if update.callback_query:
                await update.callback_query.answer("❌ Произошла ошибка. Попробуйте еще раз.", show_alert=True)
                return
            if update.effective_message:
                await update.effective_message.reply_text("❌ Произошла ошибка. Попробуйте еще раз.")
        except Exception:
            logger.exception("Failed to notify user about error")
