"""Команды Telegram: класс BotHandlers собран из миксинов (≤200 строк на файл)."""

from handlers.commands.start import BotHandlersStart
from handlers.commands.help_stats import BotHandlersHelpStats
from handlers.commands.quests_admin import BotHandlersQuestsAdmin
from handlers.commands.clan import BotHandlersClan
from handlers.commands.season_pass import BotHandlersSeasonPass
from handlers.commands.shop_payments import BotHandlersShopPayments
from handlers.commands.referral_notify import BotHandlersReferralNotify
from handlers.commands.invite_health import BotHandlersInviteHealth


class BotHandlers(
    BotHandlersInviteHealth,
    BotHandlersShopPayments,
    BotHandlersReferralNotify,
    BotHandlersSeasonPass,
    BotHandlersClan,
    BotHandlersQuestsAdmin,
    BotHandlersHelpStats,
    BotHandlersStart,
):
    """Основные обработчики команд бота."""

    pass


__all__ = ["BotHandlers"]
