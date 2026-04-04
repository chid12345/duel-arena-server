"""
Простой тест бота для проверки кнопок
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

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

logger = logging.getLogger(__name__)

async def start(update: Update, context):
    """Команда /start"""
    keyboard = [
        [InlineKeyboardButton("🎯 Тест 1", callback_data='test1')],
        [InlineKeyboardButton("🎮 Тест 2", callback_data='test2')],
        [InlineKeyboardButton("📊 Статус", callback_data='status')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "🎮 **Тестовый бот**\n\nНажмите на кнопки для проверки:",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def button_handler(update: Update, context):
    """Обработчик кнопок"""
    query = update.callback_query
    await query.answer()
    
    callback_data = query.data
    
    if callback_data == 'test1':
        await query.edit_message_text("✅ Кнопка 1 работает!", parse_mode='Markdown')
    elif callback_data == 'test2':
        await query.edit_message_text("✅ Кнопка 2 работает!", parse_mode='Markdown')
    elif callback_data == 'status':
        await query.edit_message_text("📊 Бот работает нормально!", parse_mode='Markdown')
    else:
        await query.edit_message_text("❌ Неизвестная команда", parse_mode='Markdown')

def main():
    """Запуск тестового бота"""
    try:
        if not BOT_TOKEN or BOT_TOKEN == 'YOUR_BOT_TOKEN':
            logger.error("❌ Токен бота не установлен!")
            return
        
        application = Application.builder().token(BOT_TOKEN).build()
        
        application.add_handler(CommandHandler("start", start))
        application.add_handler(CallbackQueryHandler(button_handler))
        
        logger.info("🚀 Запуск тестового бота...")
        print("=" * 50)
        print("🎮 ТЕСТОВЫЙ БОТ ЗАПУЩЕН!")
        print("=" * 50)
        print("📝 Отправьте /start для теста кнопок")
        print("=" * 50)
        
        application.run_polling()
        
    except KeyboardInterrupt:
        logger.info("🛑 Бот остановлен")
    except Exception as e:
        logger.error(f"❌ Ошибка: {e}")

if __name__ == '__main__':
    main()
