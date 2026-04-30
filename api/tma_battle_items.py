"""Чтение надетого шмота игрока для боевой карточки.

Возвращает список вида [{slot, item_id, name, rarity, color, rarity_label}],
объединяя реальные предметы из get_equipment + косметическую броню из
get_equipped_class (если стат-брони нет в слоте armor).

Используется для my_items (своя карточка) и opp_items в PvP (соперник-человек).
PvE-боты идут другим путём — через persona_gear/equipment_items в tma_bots.
"""
from __future__ import annotations

from typing import Any, Dict, List

_TYPE_RAR = {"free": "common", "gold": "rare", "diamonds": "epic",
             "mythic": "mythic", "usdt": "mythic"}
_RAR_COL = {"common": "#9aa0a6", "rare": "#3cc864",
            "epic": "#b45aff", "mythic": "#ffc83c"}
_RAR_LBL = {"common": "Обычное", "rare": "Редкое",
            "epic": "Эпическое", "mythic": "Мифическое"}


def items_for_user(uid: int) -> List[Dict[str, Any]]:
    if not uid:
        return []
    try:
        from database import db as _db
        from repositories.bots.persona_gear import items_for_ui
        eq_dict = _db.get_equipment(int(uid)) or {}
        items_map = {slot: data.get("item_id")
                     for slot, data in eq_dict.items() if data.get("item_id")}
        items = items_for_ui(items_map) or []
        if not any(it.get("slot") == "armor" for it in items):
            equipped_cls = _db.get_equipped_class(int(uid))
            if equipped_cls:
                cls_id = equipped_cls.get("class_id", "")
                cls_type = equipped_cls.get("class_type", "free")
                rar = _TYPE_RAR.get(cls_type, "common")
                cls_info = _db.get_class_info(cls_id) if hasattr(_db, "get_class_info") else {}
                name = (cls_info or {}).get("name", "Броня")
                items.append({
                    "slot": "armor",
                    "item_id": cls_id,
                    "name": name,
                    "rarity": rar,
                    "rarity_label": _RAR_LBL.get(rar, rar),
                    "color": _RAR_COL.get(rar, "#9aa0a6"),
                })
        return items
    except Exception:
        return []
