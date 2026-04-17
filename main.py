"""
Duel Arena Bot - Главная точка входа
Портативный сервер для быстрых PvP боев в Telegram
"""

import logging
import sys
import time as _time
import urllib.request
import urllib.parse
from datetime import time as dt_time
from telegram import Update, BotCommand, MenuButtonWebApp, MenuButtonDefault, WebAppInfo
from telegram.error import Conflict as TelegramConflict
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, PreCheckoutQueryHandler, MessageHandler, filters

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from config import BOT_TOKEN, WEBAPP_PUBLIC_URL, DATABASE_URL
from database import db
from bot_handlers import BotHandlers, CallbackHandlers
import progression_loader

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

logger = logging.getLogger(__name__)
logger.info("Прогрессия: %s", progression_loader.describe_progression_summary())

async def error_handler(update: object, context):
    """Глобальный обработчик ошибок Telegram."""
    # Conflict во время работы = конкурирующий инстанс (Render zero-downtime deploy).
    # Останавливаем приложение → while-loop в main() сделает force_steal и перезапустит.
    if isinstance(context.error, TelegramConflict):
        logger.warning("⚠️ Conflict во время polling — останавливаю приложение для рестарта...")
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

async def daily_bonus_reminder(context):
    """Push-уведомление: напоминание о ежедневном бонусе (запускается в 12:00)."""
    players = db.get_players_with_chat_id(limit=5000)
    for p in players:
        try:
            bonus = db.check_daily_bonus(p['user_id'])
            # check_daily_bonus возвращает can_claim=True и сразу начисляет — нам нужна проверка БЕЗ начисления
            # Поэтому просто шлём напоминание всем кто давно не заходил
            pass
        except Exception:
            pass
    # Просто шлём всем у кого есть chat_id и кто не заходил 20+ часов
    conn = db.get_connection()
    cursor = conn.cursor()
    if DATABASE_URL:
        stale = "last_active < (NOW() - INTERVAL '20 hours')"
    else:
        stale = "last_active < datetime('now', '-20 hours')"
    cursor.execute(
        f"""SELECT user_id, chat_id FROM players
           WHERE chat_id IS NOT NULL
             AND {stale}
           LIMIT 1000"""
    )
    rows = cursor.fetchall()
    conn.close()
    for row in rows:
        try:
            await context.bot.send_message(
                chat_id=row['chat_id'],
                text="🎁 Не забудь забрать ежедневный бонус! Открой /start",
            )
        except Exception:
            pass

async def setup_bot_menu(application: Application):
    """Настроить меню команд Telegram."""
    commands = [
        BotCommand("start", "Главное меню"),
        BotCommand("help", "Справка по игре"),
        BotCommand("stats", "Ваша статистика"),
        BotCommand("rating", "Топ игроков"),
        BotCommand("quests", "Ежедневные квесты"),
        BotCommand("season", "Текущий сезон"),
        BotCommand("pass", "Боевой пропуск"),
        BotCommand("clan", "Кланы"),
        BotCommand("buy", "Купить алмазы"),
        BotCommand("invite", "Пригласить друга"),
        BotCommand("health", "Проверка состояния (админ)"),
    ]
    await application.bot.set_my_commands(commands)
    if WEBAPP_PUBLIC_URL:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🎮 Арена",
                web_app=WebAppInfo(url=WEBAPP_PUBLIC_URL),
            )
        )
        logger.info("✅ Кнопка меню Mini App: %s", WEBAPP_PUBLIC_URL)
    else:
        await application.bot.set_chat_menu_button(menu_button=MenuButtonDefault())
    logger.info("✅ Меню команд Telegram обновлено")

def _build_app(bot_count: int) -> Application:
    """Собрать и настроить Application (вызывается при каждом retry)."""
    async def post_init(application: Application):
        # Удаляем вебхук — иначе «другой getUpdates» при первом деплое
        await application.bot.delete_webhook(drop_pending_updates=True)
        await setup_bot_menu(application)
        from battle_system import battle_system
        battle_system.attach(application)
        application.job_queue.run_daily(
            daily_bonus_reminder,
            time=dt_time(hour=12, minute=0),
            name="daily_bonus_reminder",
        )
        async def _pvp_clear_stale_job(context):
            deleted = db.pvp_clear_stale(older_than_seconds=300)
            if deleted:
                logger.info("pvp_clear_stale: удалено %s устаревших записей", deleted)
        application.job_queue.run_repeating(
            _pvp_clear_stale_job, interval=120, first=120,
            name="pvp_clear_stale",
        )
        from jobs.hp_full_notify import hp_full_notify_job
        application.job_queue.run_repeating(
            hp_full_notify_job, interval=90, first=90,
            name="hp_full_notify",
        )
        # Очистка боёв без реплея (старый формат до фичи replay) — раз в час, пачками.
        from jobs.battles_cleanup import battles_cleanup_job
        application.job_queue.run_repeating(
            battles_cleanup_job, interval=3600, first=60,
            name="battles_cleanup",
        )
        # Авто-кик неактивных участников клана (30+ дней без боя), раз в сутки.
        from jobs.clan_inactive_kick import clan_inactive_kick_job
        application.job_queue.run_repeating(
            clan_inactive_kick_job, interval=86400, first=300,
            name="clan_inactive_kick",
        )
        # Ротация сезона клана (7д) — раз в час: закрывает просроченный + новый.
        from jobs.clan_season_rotate import clan_season_rotate_job
        application.job_queue.run_repeating(
            clan_season_rotate_job, interval=3600, first=120,
            name="clan_season_rotate",
        )
        # Мировой босс — тик раз в 60 сек: планирует/стартует/закрывает рейды.
        from jobs.world_boss_scheduler import world_boss_scheduler_job
        application.job_queue.run_repeating(
            world_boss_scheduler_job, interval=60, first=30,
            name="world_boss_scheduler",
        )
        # Финализация клан-войн (24ч ends_at) — раз в 10 минут
        from jobs.clan_wars_finalize import clan_wars_finalize_job
        application.job_queue.run_repeating(
            clan_wars_finalize_job, interval=600, first=180,
            name="clan_wars_finalize",
        )
        # Авто-healing кланов (мёртвый лидер → передача или роспуск), раз в сутки.
        from jobs.clan_heal import clan_heal_job
        application.job_queue.run_repeating(
            clan_heal_job, interval=86400, first=600,
            name="clan_heal",
        )

    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()

    app.add_handler(CommandHandler("start",      BotHandlers.start_command))
    app.add_handler(CommandHandler("help",       BotHandlers.help_command))
    app.add_handler(CommandHandler("stats",      BotHandlers.stats_command))
    app.add_handler(CommandHandler("rating",     BotHandlers.rating_command))
    app.add_handler(CommandHandler("quests",     BotHandlers.quests_command))
    app.add_handler(CommandHandler("invite",     BotHandlers.invite_command))
    app.add_handler(CommandHandler("season",     BotHandlers.season_command))
    app.add_handler(CommandHandler("end_season", BotHandlers.end_season_command))
    app.add_handler(CommandHandler("clan",       BotHandlers.clan_command))
    app.add_handler(CommandHandler("buy",        BotHandlers.buy_command))
    app.add_handler(CommandHandler("health",     BotHandlers.health_command))
    app.add_handler(CommandHandler("wipe_me",    BotHandlers.wipe_me_command))
    app.add_handler(CommandHandler("agent_code", BotHandlers.agent_code_command))
    app.add_handler(CommandHandler("admin_list_clans",  BotHandlers.admin_list_clans_command))
    app.add_handler(CommandHandler("admin_delete_clan", BotHandlers.admin_delete_clan_command))
    app.add_handler(PreCheckoutQueryHandler(BotHandlers.pre_checkout_handler))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, BotHandlers.successful_payment_handler))
    app.add_handler(CallbackQueryHandler(CallbackHandlers.handle_callback))
    app.add_error_handler(error_handler)
    return app


def _force_steal_polling_session() -> None:
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
            _force_steal_polling_session()
            _time.sleep(3)  # дать Telegram зарегистрировать смену владельца сессии
            logger.info("⚔️ Запуск бота (попытка %d)...", attempt + 1)
            app = _build_app(bot_count)
            app.run_polling(drop_pending_updates=True)
            logger.info("✅ Бот завершил работу штатно")
            break

        except TelegramConflict:
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
