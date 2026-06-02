"""
Duel Arena Bot — главная точка входа.
Bootstrap + retry-цикл. Вся сборка Application — в bot_app/.
"""

import asyncio
import logging
import sys
import time as _time
from telegram.error import Conflict as TelegramConflict

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from config import BOT_TOKEN
from database import db
import progression_loader
from bot_app.builder import _build_app
from bot_app.polling_steal import force_steal_polling_session

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

logger = logging.getLogger(__name__)
logger.info("Прогрессия: %s", progression_loader.describe_progression_summary())


def main():
    """Главная функция запуска бота."""
    # Проверка токена
    if not BOT_TOKEN or BOT_TOKEN == 'YOUR_BOT_TOKEN':
        logger.error("❌ Токен бота не установлен!")
        return

    logger.info("🗄️ База данных подключена")

    conn = db.get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM bots")
        bot_count = cursor.fetchone()["cnt"]
    finally:
        conn.close()
    logger.info("🤖 Готово ботов: %d", bot_count)

    # ── Retry-цикл: при Conflict (два экземпляра в Render zero-downtime deploy)
    # ждём пока старый контейнер умрёт и пробуем снова.
    # Render может держать старый контейнер долго — retry без жёсткого лимита,
    # ждём до 60 сек между попытками. Выход только по не-Conflict ошибке или Ctrl-C.
    attempt = 0
    while True:
        try:
            # PTB закрывает event loop внутри run_polling → на retry нужен свежий.
            # Без этого вторая попытка падает с RuntimeError: Event loop is closed.
            asyncio.set_event_loop(asyncio.new_event_loop())
            force_steal_polling_session()
            _time.sleep(3)  # дать Telegram зарегистрировать смену владельца сессии
            logger.info("⚔️ Запуск бота (попытка %d)...", attempt + 1)
            app = _build_app(bot_count)
            app.run_polling(drop_pending_updates=True)

            # Stale-exit: я устаревший контейнер (есть новый деплой), error_handler
            # это распознал → выхожу без retry, чтоб не пинать нового.
            if app.bot_data.get("__stale_exit"):
                logger.info("🪦 Старый контейнер выходит — новый деплой live.")
                return

            # error_handler ловит Conflict и вызывает stop_running → run_polling
            # возвращается БЕЗ исключения. Проверяем флаг чтобы отличить Conflict от
            # штатного выхода (Ctrl-C / SIGTERM).
            if app.bot_data.get("__conflict_retry"):
                attempt += 1
                wait = min(60, 15 * attempt)   # 15 → 30 → 45 → 60 → 60 → … сек
                logger.warning(
                    "⚠️ Telegram Conflict — другой экземпляр бота ещё активен. "
                    "Жду %ds перед повтором (попытка %d)...",
                    wait, attempt + 1,
                )
                _time.sleep(wait)
                continue
            logger.info("✅ Бот завершил работу штатно")
            break

        except TelegramConflict:
            # Тоже проверяем stale — если новый деплой уже live, не ждём 60с зря.
            from bot_app.stale_check import is_stale_container
            if is_stale_container():
                logger.info("🪦 Conflict + я устарел — выхожу без retry.")
                return
            attempt += 1
            wait = min(60, 15 * attempt)       # 15 → 30 → 45 → 60 → 60 → … сек
            logger.warning(
                "⚠️ Telegram Conflict — другой экземпляр бота ещё активен. "
                "Жду %ds перед повтором (попытка %d)...",
                wait, attempt + 1,
            )
            _time.sleep(wait)
            continue

        except KeyboardInterrupt:
            logger.info("🛑 Бот остановлен пользователем")
            break

        except Exception as e:
            logger.error("❌ Ошибка запуска бота: %s", e, exc_info=True)
            break


if __name__ == '__main__':
    main()
