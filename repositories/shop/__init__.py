"""Магазин, сезоны, Battle Pass."""

from __future__ import annotations

from repositories.shop.battle_pass import ShopBattlePassMixin
from repositories.shop.seasons import ShopSeasonsMixin
from repositories.shop.store import ShopStoreMixin
from repositories.shop.tiers import BP_TIERS


class ShopMixin(ShopSeasonsMixin, ShopStoreMixin, ShopBattlePassMixin):
    """Mixin: магазин (зелья, буст, ресет), сезоны, Battle Pass."""

    BATTLE_PASS_TIERS = BP_TIERS
