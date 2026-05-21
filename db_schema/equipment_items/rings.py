"""Кольца (slot=ring1, надеваются также в ring2). 16 предметов: 4 free + 4 gold + 4 dia + 4 mythic.

Мифик-кольца стоят как остальные мифик-предметы: 800⭐ или $11.99 USDT.
power_score=3.58 (равно T4 mythic-стандарту). Раньше было 490⭐/2.97,
но при выравнивании Stars-цен под официальный курс Telegram (1$≈67⭐)
выяснилось что USDT-цена $11.99 одинаковая → Stars тоже должна быть 800.

Каждое кольцо: 1 главный стат (точность/анти-уворот/тишина/замедление) +
вторичные «% скорость восстановления HP МЕЖДУ боями» (regen_speed_pct,
ускоряет пассивный реген вне боя — см. repositories/users/hp_regen.py) и
золото%/опыт% (gold_pct/xp_pct, в наградах end_battle.py), растущие по
редкости. Прокачка усиливает их как и всё остальное.
"""
from __future__ import annotations

RINGS: dict[str, dict] = {
    "ring_free1": {"slot": "ring1", "rarity": "common", "name": "Кольцо Меткости",      "emoji": "💍", "accuracy": 3,        "regen_speed_pct": 3,  "gold_pct": 2, "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "+3% точность, +3% восст. вне боя, +2% золото"},
    "ring_free2": {"slot": "ring1", "rarity": "common", "name": "Кольцо Охотника",      "emoji": "💍", "anti_dodge_pct": 5,  "regen_speed_pct": 3,  "xp_pct": 2,   "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "-5% уворот врага, +3% восст. вне боя, +2% опыт"},
    "ring_free3": {"slot": "ring1", "rarity": "common", "name": "Кольцо Безмолвия",     "emoji": "💍", "silence_pct": 5,     "regen_speed_pct": 3,  "gold_pct": 2, "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "5% глушит крит врага, +3% восст. вне боя, +2% золото"},
    "ring_free4": {"slot": "ring1", "rarity": "common", "name": "Кольцо Оков",          "emoji": "💍", "slow_pct": 5,        "regen_speed_pct": 3,  "xp_pct": 2,   "price_gold": 800, "tier": "T1", "power_score": 27, "recommended_level": 1, "currency": "gold", "desc": "-5% двойной удар врага, +3% восст. вне боя, +2% опыт"},
    "ring_gold1": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Снайпера",        "emoji": "💍", "accuracy": 7,        "regen_speed_pct": 5,  "gold_pct": 3, "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "+7% точность, +5% восст. вне боя, +3% золото"},
    "ring_gold2": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Преследователя",  "emoji": "💍", "anti_dodge_pct": 12, "regen_speed_pct": 5,  "xp_pct": 3,   "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "-12% уворот врага, +5% восст. вне боя, +3% опыт"},
    "ring_gold3": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Тишины",          "emoji": "💍", "silence_pct": 12,    "regen_speed_pct": 5,  "gold_pct": 3, "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "12% глушит крит врага, +5% восст. вне боя, +3% золото"},
    "ring_gold4": {"slot": "ring1", "rarity": "rare",   "name": "Кольцо Замедления",      "emoji": "💍", "slow_pct": 12,       "regen_speed_pct": 5,  "xp_pct": 3,   "price_gold": 8000, "tier": "T2", "power_score": 59, "recommended_level": 20, "currency": "gold", "desc": "-12% двойной удар врага, +5% восст. вне боя, +3% опыт"},
    "ring_dia1":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Ясновидца",       "emoji": "💍", "accuracy": 12,       "regen_speed_pct": 7,  "gold_pct": 5, "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "+12% точность, +7% восст. вне боя, +5% золото"},
    "ring_dia2":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Неизбежности",    "emoji": "💍", "anti_dodge_pct": 20, "regen_speed_pct": 7,  "xp_pct": 5,   "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "-20% уворот врага, +7% восст. вне боя, +5% опыт"},
    "ring_dia3":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Молчания",        "emoji": "💍", "silence_pct": 20,    "regen_speed_pct": 7,  "gold_pct": 5, "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "20% глушит крит врага, +7% восст. вне боя, +5% золото"},
    "ring_dia4":  {"slot": "ring1", "rarity": "epic",   "name": "Кольцо Оцепенения",      "emoji": "💍", "slow_pct": 20,       "regen_speed_pct": 7,  "xp_pct": 5,   "price_diamonds": 75, "tier": "T3", "power_score": 3.0, "recommended_level": 45, "currency": "diamond", "desc": "-20% двойной удар врага, +7% восст. вне боя, +5% опыт"},
    "ring_mythic1": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Провидца",          "emoji": "💍", "accuracy": 18,       "regen_speed_pct": 10, "gold_pct": 7, "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star", "desc": "+18% точность, +10% восст. вне боя, +7% золото"},
    "ring_mythic2": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Рока",              "emoji": "💍", "anti_dodge_pct": 30, "regen_speed_pct": 10, "xp_pct": 7,   "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star", "desc": "-30% уворот врага, +10% восст. вне боя, +7% опыт"},
    "ring_mythic3": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Вечного Безмолвия", "emoji": "💍", "silence_pct": 30,    "regen_speed_pct": 10, "gold_pct": 7, "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star", "desc": "30% глушит крит врага, +10% восст. вне боя, +7% золото"},
    "ring_mythic4": {"slot": "ring1", "rarity": "mythic", "name": "Кольцо Паралича",          "emoji": "💍", "slow_pct": 30,       "regen_speed_pct": 10, "xp_pct": 7,   "price_stars": 800, "tier": "T4", "power_score": 3.58, "recommended_level": 65, "currency": "star", "desc": "-30% двойной удар врага, +10% восст. вне боя, +7% опыт"},
}
