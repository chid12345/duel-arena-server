"""Начисления рефереру за Premium, магазин, крипту, Stars."""

from __future__ import annotations

from repositories.social.referrals_process.crypto_stars import SocialReferralCryptoStarsMixin
from repositories.social.referrals_process.first_premium import SocialReferralFirstPremiumMixin
from repositories.social.referrals_process.vip_shop import SocialReferralVipShopMixin


class SocialReferralProcessMixin(
    SocialReferralFirstPremiumMixin,
    SocialReferralVipShopMixin,
    SocialReferralCryptoStarsMixin,
):
    pass
