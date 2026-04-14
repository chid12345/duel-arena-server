"""
Кланы, рефералы, Stars/CryptoPay — единый SocialMixin для Database.
"""

from repositories.social.clans import SocialClanMixin
from repositories.social.clan_chat import SocialClanChatMixin
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
    SocialClanChatMixin,
):
    """Mixin: кланы, рефералы, платежи."""

    CLAN_CREATE_COST_GOLD = 800
    WITHDRAW_MIN_USDT = 5.0
    WITHDRAW_COOLDOWN = 86400  # 24 часа


__all__ = ["SocialMixin"]
