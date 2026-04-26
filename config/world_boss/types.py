"""Типы Мирового босса — 7 уникальных боссов с картинками, фонами и VFX.

Полный набор:
- lich    Титан-Лич / Проклятый Рыцарь — фиолетовый
- shadow  Теневой Страж / Гоблин-Король — бирюзовый
- fire    Огненный Колосс / Железный Страж — оранжевый
- poison  Каменный Голем / Кристальный Страж — зелёный
- spider  Древний Страж / Паучий Владыка — фиолетовый
- lava    Лавовый Титан / Вулканический Страж — красно-оранжевый
- demon   Кровавый Демон / Адский Владыка — кроваво-красный
"""
from __future__ import annotations

import random
from typing import Any, Dict, List, Optional


WB_BOSS_TYPES: List[Dict[str, Any]] = [
    {
        "type": "lich",
        "label": "Титан-Лич",
        "emoji": "💀",
        "stat_profile_base": {"str": 0.95, "agi": 1.20, "int": 1.05},
        "bg_tint_hex": 0x44aa30,
        "name_pool": ["Титан-Лич", "Проклятый Рыцарь"],
        "sprite": "boss_lich.png",
        "glow_color": "#9b30ff",
    },
    {
        "type": "shadow",
        "label": "Теневой Страж",
        "emoji": "🌑",
        "stat_profile_base": {"str": 1.10, "agi": 1.10, "int": 1.00},
        "bg_tint_hex": 0x3a1a50,
        "name_pool": ["Теневой Джинн", "Гоблин-Король"],
        "sprite": "boss_shadow.png",
        "glow_color": "#7b2fff",
    },
    {
        "type": "fire",
        "label": "Огненный Колосс",
        "emoji": "🔥",
        "stat_profile_base": {"str": 1.15, "agi": 1.00, "int": 0.85},
        "bg_tint_hex": 0xd8202c,
        "name_pool": ["Огненный Колосс", "Железный Страж"],
        "sprite": "boss_fire.png",
        "glow_color": "#ff6600",
    },
    {
        "type": "poison",
        "label": "Каменный Голем",
        "emoji": "☠️",
        "stat_profile_base": {"str": 1.20, "agi": 0.80, "int": 1.10},
        "bg_tint_hex": 0x1a6b1a,
        "name_pool": ["Каменный Голем", "Кристальный Страж"],
        "sprite": "boss_poison.png",
        "glow_color": "#00e64d",
    },
    {
        "type": "spider",
        "label": "Древний Страж",
        "emoji": "🕷️",
        "stat_profile_base": {"str": 1.05, "agi": 1.25, "int": 0.90},
        "bg_tint_hex": 0x2a0a40,
        "name_pool": ["Древний Страж", "Паучий Владыка"],
        "sprite": "boss_spider.png",
        "glow_color": "#cc44ff",
    },
    {
        "type": "lava",
        "label": "Лавовый Титан",
        "emoji": "🌋",
        "stat_profile_base": {"str": 1.30, "agi": 0.75, "int": 1.00},
        "bg_tint_hex": 0xcc2200,
        "name_pool": ["Лавовый Титан", "Вулканический Страж"],
        "sprite": "boss_lava.png",
        "glow_color": "#ff3300",
    },
    {
        "type": "demon",
        "label": "Кровавый Демон",
        "emoji": "👹",
        "stat_profile_base": {"str": 1.25, "agi": 1.05, "int": 0.90},
        "bg_tint_hex": 0x880000,
        "name_pool": ["Кровавый Демон", "Адский Владыка"],
        "sprite": "boss_demon.png",
        "glow_color": "#cc0000",
    },
]

WB_BOSS_TYPE_BY_KEY: Dict[str, Dict[str, Any]] = {t["type"]: t for t in WB_BOSS_TYPES}
WB_DEFAULT_TYPE: Dict[str, Any] = WB_BOSS_TYPE_BY_KEY["lich"]


def roll_boss_type(rng: Optional[random.Random] = None) -> Dict[str, Any]:
    """Равновероятно выбирает один из 9 типов."""
    r = rng or random
    return r.choice(WB_BOSS_TYPES)


def get_boss_type(key: Optional[str]) -> Dict[str, Any]:
    """Безопасный геттер — если ключ неизвестен, возвращает lich."""
    if not key:
        return WB_DEFAULT_TYPE
    return WB_BOSS_TYPE_BY_KEY.get(key, WB_DEFAULT_TYPE)
