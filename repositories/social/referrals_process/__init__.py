"""Начисления рефереру за Premium, магазин, крипту, Stars."""

from __future__ import annotations

from repositories.social.referrals_process.crypto_stars import SocialReferralCryptoStarsMixin
from repositories.social.referrals_process.vip_shop import SocialReferralVipShopMixin
from repositories.social.referrals_process.reconcile import SocialReferralReconcileMixin


class SocialReferralProcessMixin(
    SocialReferralVipShopMixin,
    SocialReferralCryptoStarsMixin,
    SocialReferralReconcileMixin,
):
    pass
