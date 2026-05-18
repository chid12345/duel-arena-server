"""Минимальный базовый миксин инвентаря после сноса legacy class-системы.

Раньше тут жили _ensure_inventory_schema, _player_current_class_info,
_class_stat_vector и пр. — всё это удалено вместе с user_inventory.
Сейчас остался лишь _row_get-хелпер для совместимости с unequip_resync.
"""

from __future__ import annotations

from typing import Any


class InventoryBaseMixin:

    @staticmethod
    def _row_get(row: Any, key: str, default: Any = None) -> Any:
        if row is None:
            return default
        if isinstance(row, dict):
            return row.get(key, default)
        try:
            return row[key]
        except Exception:
            return default
