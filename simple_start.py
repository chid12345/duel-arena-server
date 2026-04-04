"""
Максимально простой старт для теста
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

logging.basicConfig(level=logging.INFO)

async def start(update: Update, context):
    """Простой старт"""
    keyboard = [
        [InlineKeyboardButton("🥊 В БОЙ!", callback_data='find_battle')],
        [InlineKeyboardButton("📊 СТАТЫ", callback_data='training')],
        [InlineKeyboardButton("🏆 РЕЙТИНГ", callback_data='rating')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "⚔️ Добро пожаловать в Дуэль-Арену!\n\nВыберите действие:",
        reply_markup=reply_markup
    )

async def button_handler(update: Update, context):
    """Обработчик кнопок"""
    query = update.callback_query
    await query.answer()
    
    if query.data == 'find_battle':
        await query.edit_message_text("🥊 Поиск боя...", parse_mode='Markdown')
    elif query.data == 'training':
        await query.edit_message_text("🏋️ Меню тренировки", parse_mode='Markdown')
    elif query.data == 'rating':
        await query.edit_message_text("🏆 Топ игроков", parse_mode='Markdown')

def main():
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(button_handler))
    
    print("🎮 Простой бот запущен!")
    application.run_polling()

if __name__ == '__main__':
    main()
