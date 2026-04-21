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
        "desc": "-2% урона, +30 HP",
    },
    "armor_chain": {
        "slot": SLOT_ARMOR, "rarity": RARITY_RARE,
        "name": "Кольчуга", "emoji": "🥋",
        "def_pct": 0.05, "hp_bonus": 80, "price_gold": 1400,
        "desc": "-5% урона, +80 HP",
    },
    "armor_dragon": {
        "slot": SLOT_ARMOR, "rarity": RARITY_EPIC,
        "name": "Броня Дракона", "emoji": "🐉",
        "def_pct": 0.10, "hp_bonus": 180, "price_gold": 0, "price_diamonds": 30,
        "desc": "-10% урона, +180 HP",
    },
    # ── ШЛЕМЫ (belt slot) ────────────────────────────────────
    # Бесплатные (common)
    "helmet_free1": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Кожаный шлем", "emoji": "⛑️",
        "hp_bonus": 25,
        "desc": "+25 HP",
    },
    "helmet_free2": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Железный шлем", "emoji": "⛑️",
        "def_pct": 0.01, "hp_bonus": 15,
        "desc": "-1% урона, +15 HP",
    },
    "helmet_free3": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Медный шлем", "emoji": "⛑️",
        "atk_bonus": 4,
        "desc": "+4 к урону",
    },
    "helmet_free4": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Шлем рекрута", "emoji": "⛑️",
        "crit_bonus": 2,
        "desc": "+2 крит",
    },
    # За золото (rare)
    "helmet_gold1": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем стражника", "emoji": "⛑️",
        "def_pct": 0.03, "hp_bonus": 60, "price_gold": 800,
        "desc": "-3% урона, +60 HP",
    },
    "helmet_gold2": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем берсерка", "emoji": "⛑️",
        "atk_bonus": 12, "crit_bonus": 3, "price_gold": 1200,
        "desc": "+12 урона, +3 крит",
    },
    "helmet_gold3": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Боевой шлем", "emoji": "⛑️",
        "def_pct": 0.04, "hp_bonus": 50, "price_gold": 1500,
        "desc": "-4% урона, +50 HP",
    },
    "helmet_gold4": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Шлем рыцаря", "emoji": "⛑️",
        "atk_bonus": 8, "def_pct": 0.02, "hp_bonus": 40, "crit_bonus": 2, "price_gold": 2000,
        "desc": "+8 урона, -2% урона, +40 HP",
    },
    # За алмазы (epic)
    "helmet_dia1": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем тени", "emoji": "⛑️",
        "atk_bonus": 22, "crit_bonus": 5, "price_gold": 0, "price_diamonds": 20,
        "desc": "+22 урона, +5 крит",
    },
    "helmet_dia2": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Титановый шлем", "emoji": "⛑️",
        "def_pct": 0.07, "hp_bonus": 110, "price_gold": 0, "price_diamonds": 30,
        "desc": "-7% урона, +110 HP",
    },
    "helmet_dia3": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем провидца", "emoji": "⛑️",
        "def_pct": 0.05, "hp_bonus": 80, "crit_bonus": 4, "price_gold": 0, "price_diamonds": 45,
        "desc": "-5% урона, +80 HP, +4 крит",
    },
    "helmet_dia4": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Шлем завоевателя", "emoji": "⛑️",
        "atk_bonus": 30, "def_pct": 0.03, "price_gold": 0, "price_diamonds": 60,
        "desc": "+30 урона, -3% урона",
    },
    # Мифические (stars + usdt)
    "helmet_mythic1": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Шлем Дракона", "emoji": "🐲",
        "atk_bonus": 35, "def_pct": 0.08, "hp_bonus": 130,
        "price_stars": 590,
        "desc": "+35 урона, -8% урона, +130 HP",
    },
    "helmet_mythic2": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Корона Воителя", "emoji": "👑",
        "atk_bonus": 28, "crit_bonus": 12, "def_pct": 0.05,
        "price_stars": 590,
        "desc": "+28 урона, +12 крит, -5% урона",
    },
    "helmet_mythic3": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Маска Смерти", "emoji": "💀",
        "atk_bonus": 40, "crit_bonus": 10,
        "price_stars": 590,
        "desc": "+40 урона, +10 крит",
    },
    "helmet_mythic4": {
        "slot": SLOT_BELT, "rarity": "mythic",
        "name": "Шлем Богов", "emoji": "⚡",
        "def_pct": 0.12, "hp_bonus": 200, "crit_bonus": 8,
        "price_stars": 590,
        "desc": "-12% урона, +200 HP, +8 крит",
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
