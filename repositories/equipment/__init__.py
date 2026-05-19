"""Экипировка игрока: надеть, снять, получить бонусы.

Armor2ModsMixin — новая чистая кастомка armor2_mythic4 (+19 свободных статов).
Старый ArmorModsMixin снесён под корень со всем legacy armor.
"""

from repositories.equipment.armor2_mods_repo import Armor2ModsMixin
from repositories.equipment.equipment_repo import EquipmentMixin

__all__ = ["Armor2ModsMixin", "EquipmentMixin"]
