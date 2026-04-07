"""
bot_handlers.py — тонкий прокси.
Весь код переехал в handlers/.
Внешний код импортирует отсюда как прежде.
"""
from handlers import BotHandlers, CallbackHandlers, register_all, tg_api_call, RateLimiter
