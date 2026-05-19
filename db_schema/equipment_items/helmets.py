"""Шлемы (slot=belt). 16 предметов: 4 free + 4 gold + 4 diamond + 4 mythic.

Этап 3B редизайна — чистый перенос из db_schema/equipment_catalog.py.
Числа НЕ менялись. power_score/tier добавятся в куске 3C.
"""
from __future__ import annotations

HELMETS: dict[str, dict] = {
    # ── Бесплатные (common) — каждый = одна роль, чистый стат ──
    "helmet_free1": {
        "slot": "belt", "rarity": "common",
        "name": "Шлем Танка", "emoji": "⛑️",
        "hp_bonus": 60, "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold",
        "desc": "+60 HP — чистый запас жизни",
    },
    "helmet_free2": {
        "slot": "belt", "rarity": "common",
        "name": "Шлем Стража", "emoji": "⛑️",
        "def_pct": 0.03, "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold",
        "desc": "-3% урона врага",
    },
    "helmet_free3": {
        "slot": "belt", "rarity": "common",
        "name": "Шлем Охотника", "emoji": "⛑️",
        "atk_bonus": 8, "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold",
        "desc": "+8 к урону",
    },
    "helmet_free4": {
        "slot": "belt", "rarity": "common",
        "name": "Шлем Дуэлянта", "emoji": "⛑️",
        "crit_bonus": 4, "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold",
        "desc": "+4 крит — для крит-билдов",
    },
    # ── За золото (rare) — двойные синергии ──
    "helmet_gold1": {
        "slot": "belt", "rarity": "rare",
        "name": "Шлем Берсерка", "emoji": "⛑️",
        "atk_bonus": 18, "crit_bonus": 5, "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold",
        "desc": "+18 урона, +5 крит",
    },
    "helmet_gold2": {
        "slot": "belt", "rarity": "rare",
        "name": "Шлем Крепости", "emoji": "⛑️",
        "def_pct": 0.06, "hp_bonus": 90, "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold",
        "desc": "-6% урона врага, +90 HP",
    },
    "helmet_gold3": {
        "slot": "belt", "rarity": "rare",
        "name": "Шлем Снайпера", "emoji": "⛑️",
        "crit_bonus": 9, "atk_bonus": 14, "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold",
        "desc": "+9 крит, +14 урона",
    },
    "helmet_gold4": {
        "slot": "belt", "rarity": "rare",
        "name": "Шлем Паладина", "emoji": "⛑️",
        "atk_bonus": 10, "def_pct": 0.04, "hp_bonus": 55, "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold",
        "desc": "+10 урона, -4% урона врага, +55 HP",
    },
    # ── За алмазы (epic) — мощные или уникальные комбо ──
    "helmet_dia1": {
        "slot": "belt", "rarity": "epic",
        "name": "Шлем Демона", "emoji": "⛑️",
        "atk_bonus": 30, "crit_bonus": 10, "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond",
        "desc": "+30 урона, +10 крит — чистый урон",
    },
    "helmet_dia2": {
        "slot": "belt", "rarity": "epic",
        "name": "Стальная Крепость", "emoji": "⛑️",
        "def_pct": 0.09, "hp_bonus": 150, "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond",
        "desc": "-9% урона врага, +150 HP — монолит защиты",
    },
    "helmet_dia3": {
        "slot": "belt", "rarity": "epic",
        "name": "Шлем Арканы", "emoji": "⛑️",
        "crit_bonus": 14, "def_pct": 0.05, "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond",
        "desc": "+14 крит, -5% урона врага — крит + выживание",
    },
    "helmet_dia4": {
        "slot": "belt", "rarity": "epic",
        "name": "Шлем Разрушителя", "emoji": "⛑️",
        "atk_bonus": 38, "hp_bonus": 70, "pen_pct": 0.02, "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond",
        "desc": "+38 урона, +70 HP, +2% пробой брони",
    },
    # ── Мифические — топ-тир, каждый = уникальный стиль ──
    "helmet_mythic1": {
        "slot": "belt", "rarity": "mythic",
        "name": "Шлем Дракона", "emoji": "🐲",
        "atk_bonus": 42, "def_pct": 0.10, "hp_bonus": 160,
        "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star",
        "desc": "+42 урона, -10% урона врага, +160 HP — универсал",
    },
    "helmet_mythic2": {
        "slot": "belt", "rarity": "mythic",
        "name": "Корона Воителя", "emoji": "👑",
        "atk_bonus": 35, "crit_bonus": 16, "def_pct": 0.06,
        "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star",
        "desc": "+35 урона, +16 крит, -6% урона врага — для агрессоров",
    },
    "helmet_mythic3": {
        "slot": "belt", "rarity": "mythic",
        "name": "Маска Смерти", "emoji": "💀",
        "atk_bonus": 50, "crit_bonus": 14, "pen_pct": 0.03,
        "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star",
        "desc": "+50 урона, +14 крит, +3% пробой — максимальный дамаг",
    },
    "helmet_mythic4": {
        "slot": "belt", "rarity": "mythic",
        "name": "Шлем Богов", "emoji": "⚡",
        "def_pct": 0.15, "hp_bonus": 280, "crit_bonus": 12,
        "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star",
        "desc": "-15% урона врага, +280 HP, +12 крит — неубиваемый",
    },
}
