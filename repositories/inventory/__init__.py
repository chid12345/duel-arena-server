"""
Пакет инвентаря классов (гардероб, Легендарный слоты).
Публичный API: InventoryMixin для database.Database.
"""

from repositories.inventory.base import InventoryBaseMixin
from repositories.inventory.catalog import InventoryClassCatalogMixin
from repositories.inventory.crud import InventoryCrudMixin
from repositories.inventory.legacy_avatar import InventoryLegacyAvatarMixin
from repositories.inventory.switch import InventorySwitchMixin
from repositories.inventory.unequip_resync import InventoryUnequipResyncMixin
from repositories.inventory.usdt import InventoryUsdtMixin
from repositories.inventory.usdt_train import InventoryUsdtTrainMixin
from repositories.inventory.usdt_apply_passive import InventoryUsdtApplyPassiveMixin


class InventoryMixin(
    InventoryUsdtMixin,
    InventoryUsdtApplyPassiveMixin,
    InventoryUsdtTrainMixin,
    InventorySwitchMixin,
    InventoryCrudMixin,
    InventoryClassCatalogMixin,
    InventoryLegacyAvatarMixin,
    InventoryUnequipResyncMixin,
    InventoryBaseMixin,
):
    """Инвентарь классов, покупка, переключение, Легендарный образы."""

    pass


__all__ = ["InventoryMixin"]
