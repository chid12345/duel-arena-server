"""Сапоги (slot=boots). 16 предметов: 4 free + 4 gold + 4 dia + 4 mythic.

Механика отличается от шлемов: уворот, регенерация, вампиризм.

Этап 3B редизайна — чистый перенос из db_schema/equipment_catalog.py.
Числа НЕ менялись.
"""
from __future__ import annotations

BOOTS: dict[str, dict] = {
    # ── Бесплатные (common) — уворот и регенерация ──
    "boots_free1": {
        "slot": "boots", "rarity": "common",
        "name": "Сапоги Скорохода", "emoji": "👟",
        "dodge_bonus": 3, "price_gold": 800,
        "desc": "+3% уворот — быстрые ноги",
    },
    "boots_free2": {
        "slot": "boots", "rarity": "common",
        "name": "Сапоги Выносливого", "emoji": "👟",
        "regen_bonus": 12, "regen_speed_pct": 10, "price_gold": 800,
        "desc": "+12 HP/раунд, +10% скорость реген",
    },
    "boots_free3": {
        "slot": "boots", "rarity": "common",
        "name": "Сапоги Тени", "emoji": "👟",
        "dodge_bonus": 2, "regen_bonus": 8, "price_gold": 800,
        "desc": "+2% уворот, +8 HP/раунд",
    },
    "boots_free4": {
        "slot": "boots", "rarity": "common",
        "name": "Кровавый след", "emoji": "👟",
        "lifesteal_pct": 3, "price_gold": 800,
        "desc": "+3% вампиризм — 3% урона возвращается как HP",
    },
    # ── За золото (rare) — двойные синергии ──
    "boots_gold1": {
        "slot": "boots", "rarity": "rare",
        "name": "Сапоги Вихря", "emoji": "👟",
        "dodge_bonus": 7, "price_gold": 8000,
        "desc": "+7% уворот — мастер уклонения",
    },
    "boots_gold2": {
        "slot": "boots", "rarity": "rare",
        "name": "Сапоги Живучести", "emoji": "👟",
        "regen_bonus": 28, "regen_speed_pct": 20, "price_gold": 8000,
        "desc": "+28 HP/раунд, +20% скорость реген",
    },
    "boots_gold3": {
        "slot": "boots", "rarity": "rare",
        "name": "Сапоги Ветра", "emoji": "👟",
        "dodge_bonus": 5, "regen_bonus": 16, "regen_speed_pct": 10, "price_gold": 8000,
        "desc": "+5% уворот, +16 HP/раунд, +10% скорость реген",
    },
    "boots_gold4": {
        "slot": "boots", "rarity": "rare",
        "name": "Сапоги Кровопийцы", "emoji": "👟",
        "lifesteal_pct": 5, "price_gold": 8000,
        "desc": "+5% вампиризм — 5% урона возвращается как HP",
    },
    # ── За алмазы (epic) — мощные комбо ──
    "boots_dia1": {
        "slot": "boots", "rarity": "epic",
        "name": "Сапоги Призрака", "emoji": "👟",
        "dodge_bonus": 13, "price_diamonds": 75,
        "desc": "+13% уворот — мастер уклонения",
    },
    "boots_dia2": {
        "slot": "boots", "rarity": "epic",
        "name": "Сапоги Жизненной Силы", "emoji": "👟",
        "regen_bonus": 48, "regen_speed_pct": 25, "price_diamonds": 75,
        "desc": "+48 HP/раунд, +25% скорость реген",
    },
    "boots_dia3": {
        "slot": "boots", "rarity": "epic",
        "name": "Сапоги Ловчего", "emoji": "👟",
        "dodge_bonus": 9, "regen_bonus": 22, "price_diamonds": 75,
        "desc": "+9% уворот, +22 HP/раунд",
    },
    "boots_dia4": {
        "slot": "boots", "rarity": "epic",
        "name": "Поступь Вампира", "emoji": "👟",
        "lifesteal_pct": 7, "price_diamonds": 75,
        "desc": "+7% вампиризм — 7% урона возвращается как HP",
    },
    # ── Мифические — топ-тир ──
    "boots_mythic1": {
        "slot": "boots", "rarity": "mythic",
        "name": "Сапоги Дракона", "emoji": "🐲",
        "dodge_bonus": 16, "regen_bonus": 22,
        "price_stars": 590,
        "desc": "+16% уворот, +22 HP/раунд — универсал",
    },
    "boots_mythic2": {
        "slot": "boots", "rarity": "mythic",
        "name": "Поступь Бессмертия", "emoji": "💎",
        "regen_bonus": 65, "dodge_bonus": 5, "regen_speed_pct": 35,
        "price_stars": 590,
        "desc": "+65 HP/раунд, +5% уворот, +35% скорость реген",
    },
    "boots_mythic3": {
        "slot": "boots", "rarity": "mythic",
        "name": "Сапоги Призрака Смерти", "emoji": "👻",
        "dodge_bonus": 20, "regen_speed_pct": 20,
        "price_stars": 590,
        "desc": "+20% уворот, +20% скорость реген",
    },
    "boots_mythic4": {
        "slot": "boots", "rarity": "mythic",
        "name": "Сапоги Владыки Крови", "emoji": "🩸",
        "lifesteal_pct": 10,
        "price_stars": 590,
        "desc": "+10% вампиризм — каждые 100 урона = +10 HP обратно",
    },
}
