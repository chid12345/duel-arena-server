"""Каталог предметов экипировки. Слоты: weapon/shield/armor/belt/boots/ring1/ring2."""
from __future__ import annotations

from db_schema.weapon_catalog import WEAPON_CATALOG

# Редкости
RARITY_COMMON  = "common"
RARITY_RARE    = "rare"
RARITY_EPIC    = "epic"

RARITY_EMOJI = {
    RARITY_COMMON: "⚪",
    RARITY_RARE:   "🔵",
    RARITY_EPIC:   "🟣",
}

RARITY_LABEL = {
    RARITY_COMMON: "Обычный",
    RARITY_RARE:   "Редкий",
    RARITY_EPIC:   "Эпический",
}

# Слоты
SLOT_WEAPON = "weapon"
SLOT_SHIELD = "shield"
SLOT_ARMOR  = "armor"
SLOT_BELT   = "belt"
SLOT_BOOTS  = "boots"
SLOT_RING1  = "ring1"
SLOT_RING2  = "ring2"

ALL_SLOTS = [SLOT_WEAPON, SLOT_SHIELD, SLOT_ARMOR, SLOT_BELT, SLOT_BOOTS, SLOT_RING1, SLOT_RING2]

SLOT_LABEL = {
    SLOT_WEAPON: ("🗡️", "Оружие"),
    SLOT_SHIELD: ("🛡️", "Щит"),
    SLOT_ARMOR:  ("🥋", "Броня"),
    SLOT_BELT:   ("🪢", "Пояс"),
    SLOT_BOOTS:  ("👟", "Ботинки"),
    SLOT_RING1:  ("💍", "Кольцо 1"),
    SLOT_RING2:  ("💍", "Кольцо 2"),
}

# Статы предмета:
#   atk_bonus  — плоский бонус к урону
#   def_pct    — % снижения входящего урона (0.03 = 3%)
#   hp_bonus   — плоский бонус к HP
#   crit_bonus — плоский бонус к стату крита

EQUIPMENT_CATALOG: dict[str, dict] = {
    # ── ОРУЖИЕ ──────────────────────────────────────────────
    "sword_iron": {
        "slot": SLOT_WEAPON, "rarity": RARITY_COMMON,
        "name": "Железный меч", "emoji": "🗡️",
        "atk_bonus": 8, "price_gold": 300,
        "desc": "+8 к урону",
    },
    "sword_steel": {
        "slot": SLOT_WEAPON, "rarity": RARITY_RARE,
        "name": "Стальной меч", "emoji": "⚔️",
        "atk_bonus": 20, "price_gold": 1200,
        "desc": "+20 к урону",
    },
    "sword_chaos": {
        "slot": SLOT_WEAPON, "rarity": RARITY_EPIC,
        "name": "Клинок Хаоса", "emoji": "🌀",
        "atk_bonus": 40, "price_gold": 0, "price_diamonds": 25,
        "desc": "+40 к урону",
    },
    # ── БРОНЯ ────────────────────────────────────────────────
    "armor_leather": {
        "slot": SLOT_ARMOR, "rarity": RARITY_COMMON,
        "name": "Кожаная броня", "emoji": "🥋",
        "def_pct": 0.02, "hp_bonus": 30, "price_gold": 350,
        "desc": "-2% урона врага, +30 HP",
    },
    "armor_chain": {
        "slot": SLOT_ARMOR, "rarity": RARITY_RARE,
        "name": "Кольчуга", "emoji": "🥋",
        "def_pct": 0.05, "hp_bonus": 80, "price_gold": 1400,
        "desc": "-5% урона врага, +80 HP",
    },
    "armor_dragon": {
        "slot": SLOT_ARMOR, "rarity": RARITY_EPIC,
        "name": "Броня Дракона", "emoji": "🐉",
        "def_pct": 0.10, "hp_bonus": 180, "price_gold": 0, "price_diamonds": 30,
        "desc": "-10% урона врага, +180 HP",
    },
    # ── ШЛЕМЫ (belt slot) ────────────────────────────────────
    # Бесплатные — каждый = одна роль, чистый стат
    "helmet_free1": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Танка", "emoji": "⛑️",
        "hp_bonus": 60,
        "desc": "+60 HP — чистый запас жизни",
    },
    "helmet_free2": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Стража", "emoji": "⛑️",
        "def_pct": 0.03,
        "desc": "-3% урона врага",
    },
    "helmet_free3": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Охотника", "emoji": "⛑️",
        "atk_bonus": 8,
        "desc": "+8 к урону",
    },
    "helmet_free4": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем Дуэлянта", "emoji": "⛑️",
        "crit_bonus": 4,
        "desc": "+4 крит — для крит-билдов",
    },
    # За золото — двойные синергии
    "helmet_gold1": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Берсерка", "emoji": "⛑️",
        "atk_bonus": 18, "crit_bonus": 5, "price_gold": 1200,
        "desc": "+18 урона, +5 крит",
    },
    "helmet_gold2": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Крепости", "emoji": "⛑️",
        "def_pct": 0.06, "hp_bonus": 90, "price_gold": 1500,
        "desc": "-6% урона врага, +90 HP",
    },
    "helmet_gold3": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Снайпера", "emoji": "⛑️",
        "crit_bonus": 9, "atk_bonus": 14, "price_gold": 1800,
        "desc": "+9 крит, +14 урона",
    },
    "helmet_gold4": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем Паладина", "emoji": "⛑️",
        "atk_bonus": 10, "def_pct": 0.04, "hp_bonus": 55, "price_gold": 2200,
        "desc": "+10 урона, -4% урона врага, +55 HP",
    },
    # За алмазы — мощные или уникальные комбо
    "helmet_dia1": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем Демона", "emoji": "⛑️",
        "atk_bonus": 30, "crit_bonus": 10, "price_gold": 0, "price_diamonds": 25,
        "desc": "+30 урона, +10 крит — чистый урон",
    },
    "helmet_dia2": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Стальная Крепость", "emoji": "⛑️",
        "def_pct": 0.09, "hp_bonus": 150, "price_gold": 0, "price_diamonds": 35,
        "desc": "-9% урона врага, +150 HP — монолит защиты",
    },
    "helmet_dia3": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем Арканы", "emoji": "⛑️",
        "crit_bonus": 14, "def_pct": 0.05, "price_gold": 0, "price_diamonds": 50,
        "desc": "+14 крит, -5% урона врага — крит + выживание",
    },
    "helmet_dia4": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем Разрушителя", "emoji": "⛑️",
        "atk_bonus": 38, "hp_bonus": 70, "pen_pct": 0.02, "price_gold": 0, "price_diamonds": 70,
        "desc": "+38 урона, +70 HP, +2% пробой брони",
    },
    # Мифические — топ-тир, каждый = уникальный стиль игры
    "helmet_mythic1": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Шлем Дракона", "emoji": "🐲",
        "atk_bonus": 42, "def_pct": 0.10, "hp_bonus": 160,
        "price_stars": 590,
        "desc": "+42 урона, -10% урона врага, +160 HP — универсал",
    },
    "helmet_mythic2": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Корона Воителя", "emoji": "👑",
        "atk_bonus": 35, "crit_bonus": 16, "def_pct": 0.06,
        "price_stars": 590,
        "desc": "+35 урона, +16 крит, -6% урона врага — для агрессоров",
    },
    "helmet_mythic3": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Маска Смерти", "emoji": "💀",
        "atk_bonus": 50, "crit_bonus": 14, "pen_pct": 0.03,
        "price_stars": 590,
        "desc": "+50 урона, +14 крит, +3% пробой — максимальный дамаг",
    },
    "helmet_mythic4": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Шлем Богов", "emoji": "⚡",
        "def_pct": 0.15, "hp_bonus": 280, "crit_bonus": 12,
        "price_stars": 590,
        "desc": "-15% урона врага, +280 HP, +12 крит — неубиваемый",
    },
}


# Merge weapon catalog (16 items: 4 types × 4 tiers)
EQUIPMENT_CATALOG.update(WEAPON_CATALOG)


def get_item(item_id: str) -> dict | None:
    return EQUIPMENT_CATALOG.get(item_id)


def get_items_for_slot(slot: str) -> list[dict]:
    return [
        {"id": k, **v}
        for k, v in EQUIPMENT_CATALOG.items()
        if v["slot"] == slot or (slot in (SLOT_RING1, SLOT_RING2) and v["slot"] == SLOT_RING1)
    ]


def get_item_stats(item_id: str) -> dict:
    """Возвращает только боевые бонусы предмета."""
    item = EQUIPMENT_CATALOG.get(item_id, {})
    return {
        "atk_bonus":  item.get("atk_bonus", 0),
        "def_pct":    item.get("def_pct", 0.0),
        "hp_bonus":   item.get("hp_bonus", 0),
        "crit_bonus": item.get("crit_bonus", 0),
        "pen_pct":    item.get("pen_pct", 0.0),
    }
