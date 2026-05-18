"""Чтение надетого шмота игрока для боевой карточки.

Возвращает список вида [{slot, item_id, name, rarity, color, rarity_label}].
После сноса legacy class-системы armor — обычный 6-й слот в get_equipment,
никаких отдельных fallback'ов из user_inventory/current_class.

Используется для my_items (своя карточка) и opp_items в PvP (соперник-человек).
PvE-боты идут другим путём — через persona_gear/equipment_items в tma_bots.
"""
from __future__ import annotations

from typing import Any, Dict, List


def items_for_user(uid: int) -> List[Dict[str, Any]]:
    if not uid:
        return []
    try:
        from database import db as _db
        from repositories.bots.persona_gear import items_for_ui
        eq_dict = _db.get_equipment(int(uid)) or {}
        items_map = {slot: data.get("item_id")
                     for slot, data in eq_dict.items() if data.get("item_id")}
        return items_for_ui(items_map) or []
    except Exception:
        return []
