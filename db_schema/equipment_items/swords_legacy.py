"""Старые мечи (legacy=True). Заменены weapon_catalog.py, в магазин не идут.

Этап 3B редизайна — чистый перенос из db_schema/equipment_catalog.py.
Числа НЕ менялись.
"""
from __future__ import annotations

SWORDS_LEGACY: dict[str, dict] = {
    "sword_iron": {
        "slot": "weapon", "rarity": "common",
        "name": "Железный меч", "emoji": "🗡️",
        "atk_bonus": 8, "legacy": True,
        "desc": "+8 к урону",
    },
    "sword_steel": {
        "slot": "weapon", "rarity": "rare",
        "name": "Стальной клинок", "emoji": "⚔️",
        "atk_bonus": 20, "legacy": True,
        "desc": "+20 к урону",
    },
    "sword_chaos": {
        "slot": "weapon", "rarity": "epic",
        "name": "Клинок Хаоса", "emoji": "🌀",
        "atk_bonus": 40, "legacy": True,
        "desc": "+40 к урону",
    },
}
