"""Экипировка игрока: надеть, снять, получить бонусы.

ArmorModsMixin (USDT-кастомка armor_mythic4 +19 свободных статов) снесён под
корень вместе со всем старым armor — новый чистый слот «БРОНЯ» в разработке.
"""

from repositories.equipment.equipment_repo import EquipmentMixin

__all__ = ["EquipmentMixin"]
