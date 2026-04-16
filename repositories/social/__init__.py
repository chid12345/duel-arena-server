"""
Кланы, рефералы, Stars/CryptoPay — единый SocialMixin для Database.
"""

from repositories.social.clans import SocialClanMixin
from repositories.social.clans_v2 import SocialClanV2Mixin
from repositories.social.clan_chat import SocialClanChatMixin
from repositories.social.clan_management import SocialClanManagementMixin
from repositories.social.clan_join_requests import SocialClanJoinReqMixin
from repositories.social.clan_seasons import SocialClanSeasonsMixin
from repositories.social.clan_achievements import SocialClanAchMixin
from repositories.social.clan_history import SocialClanHistoryMixin
from repositories.social.clan_wars import SocialClanWarsMixin
from repositories.social.payments import SocialPaymentsMixin
from repositories.social.referrals_core import SocialReferralCoreMixin
from repositories.social.referrals_process import SocialReferralProcessMixin
from repositories.social.referrals_withdraw import SocialReferralWithdrawMixin


class SocialMixin(
    SocialPaymentsMixin,
    SocialReferralProcessMixin,
    SocialReferralWithdrawMixin,
    SocialReferralCoreMixin,
    SocialClanMixin,
    SocialClanV2Mixin,
    SocialClanChatMixin,
    SocialClanManagementMixin,
    SocialClanJoinReqMixin,
    SocialClanSeasonsMixin,
    SocialClanAchMixin,
    SocialClanHistoryMixin,
    SocialClanWarsMixin,
):
    """Mixin: кланы, рефералы, платежи."""

    CLAN_CREATE_COST_GOLD = 800
    WITHDRAW_MIN_USDT = 5.0
    WITHDRAW_COOLDOWN = 86400  # 24 часа


__all__ = ["SocialMixin"]
