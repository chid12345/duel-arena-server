"""handlers/ — Telegram-хендлеры, разбитые по темам."""

from handlers.common import tg_api_call, RateLimiter, _battle_turn_lock, _telegram_message_unchanged
from handlers.ui_helpers import CallbackHandlers  # defines the class

# Patch methods onto CallbackHandlers in dependency order
import handlers.battle_core    # диспетчер кнопок + итоги боя
import handlers.battle_pvp     # поиск боя, PvP очередь, PvE старт
import handlers.battle_rounds  # механика ходов, таймер, выбор зоны
import handlers.misc_callbacks  # магазин, кланы, тренировки, навигация

from handlers.commands import BotHandlers


def register_all(app):
    """Регистрирует все хендлеры в приложении."""
    from telegram.ext import CommandHandler, CallbackQueryHandler, MessageHandler, filters, PreCheckoutQueryHandler
    app.add_handler(CommandHandler("start", BotHandlers.start_command))
    app.add_handler(CommandHandler("help", BotHandlers.help_command))
    app.add_handler(CommandHandler("stats", BotHandlers.stats_command))
    app.add_handler(CommandHandler("rating", BotHandlers.rating_command))
    app.add_handler(CommandHandler("quests", BotHandlers.quests_command))
    app.add_handler(CommandHandler("clan", BotHandlers.clan_command))
    app.add_handler(CommandHandler("season", BotHandlers.season_command))
    app.add_handler(CommandHandler("end_season", BotHandlers.end_season_command))
    app.add_handler(CommandHandler("pass", BotHandlers.pass_command))
    app.add_handler(CommandHandler("buy", BotHandlers.buy_command))
    app.add_handler(CommandHandler("invite", BotHandlers.invite_command))
    app.add_handler(CommandHandler("health", BotHandlers.health_command))
    app.add_handler(CommandHandler("wipe_me", BotHandlers.wipe_me_command))
    app.add_handler(CommandHandler("agent_code",  BotHandlers.agent_code_command))
    app.add_handler(CommandHandler("wipe_season", BotHandlers.wipe_season_command))
    app.add_handler(CallbackQueryHandler(CallbackHandlers.handle_callback))
    app.add_handler(PreCheckoutQueryHandler(BotHandlers.pre_checkout_handler))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, BotHandlers.successful_payment_handler))
