"""
Duel Arena Bot - Главная точка входа
Портативный сервер для быстрых PvP боев в Telegram
"""

import logging
import sys
from datetime import time as dt_time
from telegram import Update, BotCommand, MenuButtonWebApp, MenuButtonDefault, WebAppInfo
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
        BotCommand("pass", "Battle Pass"),
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

def main():
    """Главная функция запуска бота"""
    try:
        # Проверка токена
        if not BOT_TOKEN or BOT_TOKEN == 'YOUR_BOT_TOKEN':
            logger.error("❌ Токен бота не установлен!")
            logger.info("📝 Установите переменную окружения TELEGRAM_BOT_TOKEN")
            logger.info("💡 PowerShell: $env:TELEGRAM_BOT_TOKEN='your_bot_token_here'")
            return
        
        # БД уже инициализируется при import database (db = Database())
        logger.info("🗄️ База данных подключена")
        
        # Проверка ботов
        conn = db.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) AS cnt FROM bots")
            bot_count = cursor.fetchone()["cnt"]
        finally:
            conn.close()
        
        logger.info(f"🤖 Готово к работе ботов: {bot_count}")
        
        # Создание приложения
        logger.info("🚀 Создание приложения Telegram бота...")
        async def post_init(application: Application):
            # Иначе Telegram: «другой getUpdates» — часто это не второй ПК, а старый webhook.
            await application.bot.delete_webhook(drop_pending_updates=True)
            await setup_bot_menu(application)
            from battle_system import battle_system
            battle_system.attach(application)
            # Ежедневный push в 12:00
            application.job_queue.run_daily(
                daily_bonus_reminder,
                time=dt_time(hour=12, minute=0),
                name="daily_bonus_reminder",
            )

        application = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
        
        # Регистрация обработчиков команд
        logger.info("📋 Регистрация обработчиков команд...")
        application.add_handler(CommandHandler("start", BotHandlers.start_command))
        application.add_handler(CommandHandler("help", BotHandlers.help_command))
        application.add_handler(CommandHandler("stats", BotHandlers.stats_command))
        application.add_handler(CommandHandler("rating", BotHandlers.rating_command))
        application.add_handler(CommandHandler("quests", BotHandlers.quests_command))
        application.add_handler(CommandHandler("invite", BotHandlers.invite_command))
        application.add_handler(CommandHandler("season", BotHandlers.season_command))
        application.add_handler(CommandHandler("end_season", BotHandlers.end_season_command))
        application.add_handler(CommandHandler("pass", BotHandlers.pass_command))
        application.add_handler(CommandHandler("clan", BotHandlers.clan_command))
        application.add_handler(CommandHandler("buy", BotHandlers.buy_command))
        application.add_handler(CommandHandler("health", BotHandlers.health_command))
        application.add_handler(CommandHandler("wipe_me", BotHandlers.wipe_me_command))
        application.add_handler(CommandHandler("agent_code", BotHandlers.agent_code_command))
        # Telegram Stars
        application.add_handler(PreCheckoutQueryHandler(BotHandlers.pre_checkout_handler))
        application.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, BotHandlers.successful_payment_handler))
        
        # Регистрация обработчиков кнопок
        logger.info("🎮 Регистрация обработчиков кнопок...")
        application.add_handler(CallbackQueryHandler(CallbackHandlers.handle_callback))
        application.add_error_handler(error_handler)
        
        # Запуск бота
        logger.info("⚔️ Запуск Duel Arena Bot...")
        print("=" * 50)
        print("⚔️ DUEL ARENA BOT ЗАПУЩЕН! ⚔️")
        print("=" * 50)
        print(f"🤖 Ботов готово: {bot_count}")
        print("📊 База данных инициализирована")
        print("🎮 Бот готов к работе!")
        print("🌐 Сервер запущен и ожидает игроков...")
        print("=" * 50)
        print("💡 Для остановки нажмите Ctrl+C")
        print("=" * 50)
        
        application.run_polling(drop_pending_updates=True)
        
    except KeyboardInterrupt:
        logger.info("🛑 Бот остановлен пользователем")
        print("\n🛑 Бот остановлен. До встречи!")
    except Exception as e:
        logger.error(f"❌ Ошибка запуска бота: {e}")
        print(f"❌ Ошибка запуска: {e}")
        print("📝 Проверьте токен и подключение к интернету")

if __name__ == '__main__':
    main()
