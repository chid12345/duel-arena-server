"""
Inventory-пакет. После сноса legacy class-системы (user_inventory + классы воина)
здесь остался только resync_player_stats — пересчёт базовых стат при рассинхроне.

USDT-кастомка (legendary armor_mythic4 +19 свободных статов) переехала в
repositories/equipment/armor_mods_repo.py — там работает с armor_custom_mods.
"""

from repositories.inventory.base import InventoryBaseMixin
from repositories.inventory.unequip_resync import InventoryUnequipResyncMixin


class InventoryMixin(
    InventoryUnequipResyncMixin,
    InventoryBaseMixin,
):
    """Минимальный слой инвентаря: только resync статов."""

    pass


__all__ = ["InventoryMixin"]
