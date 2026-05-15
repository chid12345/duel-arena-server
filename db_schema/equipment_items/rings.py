"""Кольца (slot=ring1, надеваются также в ring2). 16 предметов: 4 free + 4 gold + 4 dia + 4 mythic.

Этап 3B редизайна — чистый перенос из db_schema/equipment_catalog.py.
Числа НЕ менялись. ВНИМАНИЕ: цена mythic-колец — 490⭐ (НЕ 590, в отличие
от шлемов/щитов/сапог), это историческое значение, сохраняется.
"""
from __future__ import annotations

RINGS: dict[str, dict] = {
    "ring_free1": {"slot": "ring1", "rarity": "common", "name": "Кольцо Меткости",      "emoji": "💍", "accuracy": 3,        "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "+3% точность"},
    "ring_free2": {"slot": "ring1", "rarity": "common", "name": "Кольцо Охотника",      "emoji": "💍", "anti_dodge_pct": 5,  "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "-5% уворот врага"},
    "ring_free3": {"slot": "ring1", "rarity": "common", "name": "Кольцо Безмолвия",     "emoji": "💍", "silence_pct": 5,     "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "5% глушит крит врага"},
    "ring_free4": {"slot": "ring1", "rarity": "common", "name": "Кольцо Оков",          "emoji": "💍", "slow_pct": 5,        "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "-5% двойной удар врага"},
    "ring_gold1": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Снайпера",        "emoji": "💍", "accuracy": 7,        "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "+7% точность"},
    "ring_gold2": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Преследователя",  "emoji": "💍", "anti_dodge_pct": 12, "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "-12% уворот врага"},
    "ring_gold3": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Тишины",          "emoji": "💍", "silence_pct": 12,    "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "12% глушит крит врага"},
    "ring_gold4": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Замедления",      "emoji": "💍", "slow_pct": 12,       "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "-12% двойной удар врага"},
    "ring_dia1":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Ясновидца",       "emoji": "💍", "accuracy": 12,       "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "+12% точность"},
    "ring_dia2":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Неизбежности",    "emoji": "💍", "anti_dodge_pct": 20, "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "-20% уворот врага"},
    "ring_dia3":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Молчания",        "emoji": "💍", "silence_pct": 20,    "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "20% глушит крит врага"},
    "ring_dia4":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Оцепенения",      "emoji": "💍", "slow_pct": 20,       "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "-20% двойной удар врага"},
    "ring_mythic1": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Провидца",          "emoji": "💍", "accuracy": 18,       "price_stars": 490, "tier": "T4", "power_score": 2.97, "recommended_level": 65, "currency": "star", "desc": "+18% точность"},
    "ring_mythic2": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Рока",              "emoji": "💍", "anti_dodge_pct": 30, "price_stars": 490, "tier": "T4", "power_score": 2.97, "recommended_level": 65, "currency": "star", "desc": "-30% уворот врага"},
    "ring_mythic3": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Вечного Безмолвия", "emoji": "💍", "silence_pct": 30,    "price_stars": 490, "tier": "T4", "power_score": 2.97, "recommended_level": 65, "currency": "star", "desc": "30% глушит крит врага"},
    "ring_mythic4": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Паралича",          "emoji": "💍", "slow_pct": 30,       "price_stars": 490, "tier": "T4", "power_score": 2.97, "recommended_level": 65, "currency": "star", "desc": "-30% двойной удар врага"},
}
