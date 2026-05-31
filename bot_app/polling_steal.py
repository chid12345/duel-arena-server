"""Принудительный сброс чужой polling-сессии перед стартом."""
import logging
import urllib.request

from config import BOT_TOKEN

logger = logging.getLogger(__name__)


def force_steal_polling_session() -> None:
    """
    Принудительно убиваем чужой polling-сессию через прямой HTTP-запрос.
    Telegram отдаёт getUpdates одному клиенту — наш запрос "выигрывает" у старого.
    """
    try:
        base = f"https://api.telegram.org/bot{BOT_TOKEN}"
        # 1. deleteWebhook чтобы не было конфликта вебхук vs polling
        urllib.request.urlopen(f"{base}/deleteWebhook?drop_pending_updates=true", timeout=10)
        # 2. getUpdates с offset=-1 — захватываем сессию, старый инстанс получит Conflict
        urllib.request.urlopen(f"{base}/getUpdates?offset=-1&timeout=0", timeout=10)
        logger.info("🔄 Polling-сессия сброшена (steal OK)")
    except Exception as e:
        logger.warning("⚠️ _force_steal_polling_session: %s", e)
