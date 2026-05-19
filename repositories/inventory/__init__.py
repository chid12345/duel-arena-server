"""
Inventory-пакет. После сноса legacy class-системы (user_inventory + классы воина)
здесь остался только resync_player_stats — пересчёт базовых стат при рассинхроне.

Старый armor (player_owned_armor, armor_custom_mods, USDT-кастомка
armor_mythic4) снесён под корень — новый чистый слот «БРОНЯ» в разработке.
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
