"""Команды Telegram: класс BotHandlers собран из миксинов (≤200 строк на файл)."""

from handlers.commands.start import BotHandlersStart
from handlers.commands.help_stats import BotHandlersHelpStats
from handlers.commands.quests_admin import BotHandlersQuestsAdmin
from handlers.commands.clan import BotHandlersClan
from handlers.commands.clan_admin import BotHandlersClanAdmin
from handlers.commands.season_pass import BotHandlersSeasonPass
from handlers.commands.shop_payments import BotHandlersShopPayments
from handlers.commands.referral_notify import BotHandlersReferralNotify
from handlers.commands.invite_health import BotHandlersInviteHealth
from handlers.commands.admin_balance import BotHandlersAdminBalance
from handlers.commands.battle_pass import BotHandlersBattlePass
from handlers.commands.reset_prembox import BotHandlersResetPremBox
from handlers.commands.recover_payments import BotHandlersRecoverPayments
from handlers.commands.payout_admin import BotHandlersPayoutAdmin


class BotHandlers(
    BotHandlersPayoutAdmin,
    BotHandlersRecoverPayments,
    BotHandlersResetPremBox,
    BotHandlersBattlePass,
    BotHandlersAdminBalance,
    BotHandlersInviteHealth,
    BotHandlersShopPayments,
    BotHandlersReferralNotify,
    BotHandlersSeasonPass,
    BotHandlersClanAdmin,
    BotHandlersClan,
    BotHandlersQuestsAdmin,
    BotHandlersHelpStats,
    BotHandlersStart,
):
    """Основные обработчики команд бота."""

    pass


__all__ = ["BotHandlers"]
