"""
Пакет инвентаря классов (гардероб, USDT-слоты).
Публичный API: InventoryMixin для database.Database.
"""

from repositories.inventory.base import InventoryBaseMixin
from repositories.inventory.catalog import InventoryClassCatalogMixin
from repositories.inventory.crud import InventoryCrudMixin
from repositories.inventory.legacy_avatar import InventoryLegacyAvatarMixin
from repositories.inventory.switch import InventorySwitchMixin
from repositories.inventory.unequip_resync import InventoryUnequipResyncMixin
from repositories.inventory.usdt import InventoryUsdtMixin


class InventoryMixin(
    InventoryUsdtMixin,
    InventorySwitchMixin,
    InventoryCrudMixin,
    InventoryClassCatalogMixin,
    InventoryLegacyAvatarMixin,
    InventoryUnequipResyncMixin,
    InventoryBaseMixin,
):
    """Инвентарь классов, покупка, переключение, USDT-образы."""

    pass


__all__ = ["InventoryMixin"]
