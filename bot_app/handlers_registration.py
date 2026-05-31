"""Регистрация всех Telegram-хендлеров в Application."""
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    PreCheckoutQueryHandler, MessageHandler, filters,
)

from bot_handlers import BotHandlers, CallbackHandlers


def register_handlers(app: Application) -> None:
    """Регистрирует все CommandHandler / CallbackHandler / Payment-хендлеры."""
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
    app.add_handler(CommandHandler("admin",         BotHandlers.admin_balance_command))
    app.add_handler(CommandHandler("admin_balance", BotHandlers.admin_balance_command))
    app.add_handler(CommandHandler("pass",          BotHandlers.battle_pass_command))
    app.add_handler(CommandHandler("battle_pass",   BotHandlers.battle_pass_command))
    app.add_handler(CommandHandler("admin_list_clans",  BotHandlers.admin_list_clans_command))
    app.add_handler(CommandHandler("admin_delete_clan", BotHandlers.admin_delete_clan_command))
    app.add_handler(CommandHandler("reset_prembox",     BotHandlers.reset_prembox_command))
    # Восстановление потерянных USDT-платежей (после фикса webhook UnboundLocalError)
    app.add_handler(CommandHandler("lost_payments",  BotHandlers.lost_payments_command))
    app.add_handler(CommandHandler("my_lost",        BotHandlers.my_lost_command))
    app.add_handler(CommandHandler("recover",        BotHandlers.recover_command))
    app.add_handler(CommandHandler("recover_all_my", BotHandlers.recover_all_my_command))
    app.add_handler(CommandHandler("dismiss_my_lost", BotHandlers.dismiss_my_lost_command))
    # Ручные реферальные выплаты (владелец платит сам через @CryptoBot)
    app.add_handler(CommandHandler("payouts",        BotHandlers.payouts_command))
    app.add_handler(CommandHandler("payout_done",    BotHandlers.payout_done_command))
    app.add_handler(CommandHandler("payout_reject",  BotHandlers.payout_reject_command))
    app.add_handler(CommandHandler("reconcile_refs", BotHandlers.reconcile_refs_command))
    # Диагностика бага аренды (2026-05-18, временная)
    from handlers.commands.debug_rentals import BotHandlersDebugRentals
    app.add_handler(CommandHandler("debug_rentals", BotHandlersDebugRentals.debug_rentals_command))
    app.add_handler(PreCheckoutQueryHandler(BotHandlers.pre_checkout_handler))
    app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, BotHandlers.successful_payment_handler))
    app.add_handler(CallbackQueryHandler(CallbackHandlers.handle_callback))
