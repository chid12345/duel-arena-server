"""Пакет с данными предметов экипировки. Разбит по слотам (Закон 1, ≤200 строк/файл).

Этап 3B редизайна — чистый перенос данных из db_schema/equipment_catalog.py
без изменения логики. Каждый файл = один слот + редкости. Сборка через
get_equipment_data() в aggregate-функции.
"""
from __future__ import annotations

from db_schema.equipment_items.boots import BOOTS
from db_schema.equipment_items.helmets import HELMETS
from db_schema.equipment_items.rings import RINGS
from db_schema.equipment_items.shields import SHIELDS
from db_schema.equipment_items.swords_legacy import SWORDS_LEGACY


def all_equipment_items() -> dict[str, dict]:
    """Собрать словарь {item_id: item_dict} из всех модулей слотов."""
    out: dict[str, dict] = {}
    out.update(SWORDS_LEGACY)
    out.update(HELMETS)
    out.update(SHIELDS)
    out.update(RINGS)
    out.update(BOOTS)
    return out


__all__ = ["all_equipment_items", "SWORDS_LEGACY", "HELMETS", "SHIELDS", "RINGS", "BOOTS"]
