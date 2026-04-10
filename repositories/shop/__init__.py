"""Магазин, сезоны, Battle Pass, бафы, инвентарь предметов."""

from __future__ import annotations

from repositories.shop.battle_pass import ShopBattlePassMixin
from repositories.shop.buffs import ShopBuffsMixin
from repositories.shop.item_inventory import ShopItemInventoryMixin
from repositories.shop.seasons import ShopSeasonsMixin
from repositories.shop.store import ShopStoreMixin
from repositories.shop.tiers import BP_TIERS


class ShopMixin(ShopSeasonsMixin, ShopStoreMixin, ShopBattlePassMixin, ShopBuffsMixin, ShopItemInventoryMixin):
    """Mixin: магазин (зелья, буст, ресет), сезоны, Battle Pass, бафы, инвентарь."""

    BATTLE_PASS_TIERS = BP_TIERS
