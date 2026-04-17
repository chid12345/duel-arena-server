"""Типы Мирового босса (Фаза 2.2).

Каждый тип задаёт базовый stat_profile (str/agi/int) — при спавне
scheduler умножает эти множители на дополнительный рандом ±10%.
Игрок видит эмоджи и название типа → может заранее сориентироваться,
какие статы у него «в масть».

UI-палитра `bg_tint_hex` — крючок для будущей интеграции с
`webapp/scene_world_boss_bg.js` (Фаза 2.3 или доп. шаг).
"""
from __future__ import annotations

import random
from typing import Any, Dict, List, Optional


# str — физический (ответка по HP), agi — уклон/крит игрока плохо работают,
# int — магические коронные удары сильнее. Значения относительно «1.0».
WB_BOSS_TYPES: List[Dict[str, Any]] = [
    {
        "type": "universal",
        "label": "Универсальный",
        "emoji": "🐉",
        "stat_profile_base": {"str": 1.00, "agi": 1.00, "int": 1.00},
        "bg_tint_hex": 0x4a3a5a,
        "name_pool": ["Древний Страж", "Каменный Голем"],
    },
    {
        "type": "fire",
        "label": "Огненный",
        "emoji": "🔥",
        "stat_profile_base": {"str": 1.15, "agi": 1.00, "int": 0.85},
        "bg_tint_hex": 0xd8202c,
        "name_pool": ["Огненный Колосс", "Небесный Феникс"],
    },
    {
        "type": "ice",
        "label": "Ледяной",
        "emoji": "❄️",
        "stat_profile_base": {"str": 0.90, "agi": 0.90, "int": 1.25},
        "bg_tint_hex": 0x2a88d8,
        "name_pool": ["Ледяной Дракон", "Морской Кракен"],
    },
    {
        "type": "poison",
        "label": "Ядовитый",
        "emoji": "☠️",
        "stat_profile_base": {"str": 0.95, "agi": 1.20, "int": 1.05},
        "bg_tint_hex": 0x44aa30,
        "name_pool": ["Титан-Лич", "Проклятый Рыцарь"],
    },
    {
        "type": "shadow",
        "label": "Теневой",
        "emoji": "🌑",
        "stat_profile_base": {"str": 1.10, "agi": 1.10, "int": 1.00},
        "bg_tint_hex": 0x3a1a50,
        "name_pool": ["Теневой Джинн", "Гоблин-Король"],
    },
]

WB_BOSS_TYPE_BY_KEY: Dict[str, Dict[str, Any]] = {t["type"]: t for t in WB_BOSS_TYPES}
WB_DEFAULT_TYPE: Dict[str, Any] = WB_BOSS_TYPE_BY_KEY["universal"]


def roll_boss_type(rng: Optional[random.Random] = None) -> Dict[str, Any]:
    """Равновероятно выбирает один из 5 типов."""
    r = rng or random
    return r.choice(WB_BOSS_TYPES)


def get_boss_type(key: Optional[str]) -> Dict[str, Any]:
    """Безопасный геттер — если ключ неизвестен, возвращает universal."""
    if not key:
        return WB_DEFAULT_TYPE
    return WB_BOSS_TYPE_BY_KEY.get(key, WB_DEFAULT_TYPE)
