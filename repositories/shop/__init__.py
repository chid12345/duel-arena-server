"""Магазин, сезоны, бафы, инвентарь предметов."""

from __future__ import annotations

from repositories.shop.buffs import ShopBuffsMixin
from repositories.shop.item_inventory import ShopItemInventoryMixin
from repositories.shop.seasons import ShopSeasonsMixin
from repositories.shop.store import ShopStoreMixin


class ShopMixin(ShopSeasonsMixin, ShopStoreMixin, ShopBuffsMixin, ShopItemInventoryMixin):
    """Mixin: магазин (зелья, буст, ресет), сезоны, бафы, инвентарь."""
