"""
100% рабочий бот для теста кнопок
"""

import logging
import sys
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler

# Устанавливаем кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from config import BOT_TOKEN

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

logger = logging.getLogger(__name__)

async def start(update: Update, context):
    """Команда /start"""
    user = update.effective_user
    
    # Простое текстовое сообщение
    text = f"👋 Привет, {user.first_name}!\n\nЭто тестовый бот ZenDuelArena.\n\nВыберите действие:"
    
    # Простые кнопки
    keyboard = [
        [InlineKeyboardButton("🥊 НАЧАТЬ БОЙ", callback_data='battle')],
        [InlineKeyboardButton("📈 СВОДКА", callback_data='stats')],
        [InlineKeyboardButton("🏆 ТОП ИГРОКОВ", callback_data='top')],
        [InlineKeyboardButton("❓ ПОМОЩЬ", callback_data='help')]
    ]
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    try:
        await update.message.reply_text(text, reply_markup=reply_markup)
        logger.info(f"Sent start message to {user.username}")
    except Exception as e:
        logger.error(f"Error sending start message: {e}")
        await update.message.reply_text("Привет! Кнопки временно недоступны.")

async def button_handler(update: Update, context):
    """Обработчик кнопок"""
    query = update.callback_query
    user = update.effective_user
    
    logger.info(f"Button pressed: {query.data} by {user.username}")
    
    try:
        await query.answer()  # Обязательно отвечаем на callback
        
        if query.data == 'battle':
            await query.edit_message_text(
                "⚔️ **ПОИСК БОЯ**\n\n🤖 Ищем противника...\n\n⏳ Пожалуйста, подождите...",
                parse_mode='Markdown'
            )
            
        elif query.data == 'stats':
            stats_text = f"""📈 **СВОДКА**

👤 Игрок: {user.first_name}
📊 Уровень: 1
⭐ Опыт: 0/100

❤️ Выносливость: 100/100
💪 Сила: 10
🤸 Ловкость: 10

💰 Золото: 50
🏆 Рейтинг: 1000

🔥 Побед: 0
💤 Поражений: 0

📈 Win Rate: 0%"""
            
            await query.edit_message_text(stats_text, parse_mode='Markdown')
            
        elif query.data == 'top':
            top_text = """🏆 **ТОП-10 ИГРОКОВ**

🥇 TestPlayer1 - Ур.15 - 1500 рейтинга
🥈 TestPlayer2 - Ур.12 - 1350 рейтинга  
🥉 TestPlayer3 - Ур.10 - 1200 рейтинга
4️⃣ TestPlayer4 - Ур.8 - 1100 рейтинга
5️⃣ TestPlayer5 - Ур.7 - 1000 рейтинга

*Реальный топ появится после игры игроков*"""
            
            await query.edit_message_text(top_text, parse_mode='Markdown')
            
        elif query.data == 'help':
            help_text = """❓ **ПОМОЩЬ**

🎮 **Как играть:**
1. Нажмите "НАЧАТЬ БОЙ"
2. Выберите атаку и защиту
3. Победите противника!

📋 **Команды:**
/start - главное меню
/help - эта справка

💡 **Совет:**
Бой идет до победы одного из бойцов!
Удачи на Арене! 🍀"""
            
            await query.edit_message_text(help_text, parse_mode='Markdown')
            
        else:
            await query.edit_message_text("❌ Неизвестное действие")
            
    except Exception as e:
        logger.error(f"Error in button handler: {e}")
        await query.edit_message_text("Произошла ошибка. Попробуйте снова.")

async def help_command(update: Update, context):
    """Команда /help"""
    help_text = """🎮 **ZEN DUEL ARENA - ПОМОЩЬ**

📋 **Основные команды:**
/start - главное меню с кнопками
/help - эта справка

🎯 **Как играть:**
1. Нажмите "НАЧАТЬ БОЙ"
2. Выбирайте зону атаки и защиты
3. Победите противника!

💰 **Что в игре:**
⚔️ Быстрые PvP бои
📊 Прокачка персонажа  
🏆 Рейтинги и турниры
🤖 Умные боты-противники

🔗 **Найти бота:**
@ZenDuelArena_bot
https://t.me/ZenDuelArena_bot

Удачи на Арене! 🍀"""
    
    await update.message.reply_text(help_text, parse_mode='Markdown')

def main():
    """Запуск бота"""
    try:
        if not BOT_TOKEN or BOT_TOKEN == 'YOUR_BOT_TOKEN':
            print("❌ Токен бота не установлен!")
            print("📝 Отредактируйте config.py")
            return
        
        print("🚀 Запуск ZenDuelArena Bot...")
        print("=" * 50)
        
        # Создание приложения
        application = Application.builder().token(BOT_TOKEN).build()
        
        # Регистрация обработчиков
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CommandHandler("help", help_command))
        application.add_handler(CallbackQueryHandler(button_handler))
        
        print("✅ Обработчики зарегистрированы")
        print("🤖 Бот запускается...")
        print("=" * 50)
        print("🎮 Бот готов к работе!")
        print("📝 Отправьте /start для начала")
        print("🔗 Ссылка: https://t.me/ZenDuelArena_bot")
        print("=" * 50)
        
        # Запуск бота
        application.run_polling()
        
    except KeyboardInterrupt:
        print("\n🛑 Бот остановлен пользователем")
    except Exception as e:
        print(f"❌ Ошибка запуска бота: {e}")
        logger.error(f"Bot error: {e}")

if __name__ == '__main__':
    main()
