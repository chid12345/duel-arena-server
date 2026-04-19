"""Каталог предметов экипировки. Слоты: weapon/shield/armor/belt/boots/ring1/ring2."""
from __future__ import annotations

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
    # ── ЩИТ ─────────────────────────────────────────────────
    "shield_wood": {
        "slot": SLOT_SHIELD, "rarity": RARITY_COMMON,
        "name": "Деревянный щит", "emoji": "🛡️",
        "def_pct": 0.03, "price_gold": 250,
        "desc": "-3% входящего урона",
    },
    "shield_iron": {
        "slot": SLOT_SHIELD, "rarity": RARITY_RARE,
        "name": "Железный щит", "emoji": "🛡️",
        "def_pct": 0.06, "price_gold": 1000,
        "desc": "-6% входящего урона",
    },
    "shield_aegis": {
        "slot": SLOT_SHIELD, "rarity": RARITY_EPIC,
        "name": "Эгида Стража", "emoji": "✨",
        "def_pct": 0.12, "price_gold": 0, "price_diamonds": 20,
        "desc": "-12% входящего урона",
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
    # ── ПОЯС ─────────────────────────────────────────────────
    "belt_cloth": {
        "slot": SLOT_BELT, "rarity": RARITY_COMMON,
        "name": "Тканевый пояс", "emoji": "🪢",
        "hp_bonus": 25, "price_gold": 200,
        "desc": "+25 HP",
    },
    "belt_leather": {
        "slot": SLOT_BELT, "rarity": RARITY_RARE,
        "name": "Кожаный пояс", "emoji": "🪢",
        "hp_bonus": 65, "price_gold": 800,
        "desc": "+65 HP",
    },
    "belt_titan": {
        "slot": SLOT_BELT, "rarity": RARITY_EPIC,
        "name": "Пояс Титана", "emoji": "💠",
        "hp_bonus": 150, "price_gold": 0, "price_diamonds": 18,
        "desc": "+150 HP",
    },
    # ── БОТИНКИ ──────────────────────────────────────────────
    "boots_cloth": {
        "slot": SLOT_BOOTS, "rarity": RARITY_COMMON,
        "name": "Тканевые ботинки", "emoji": "👟",
        "atk_bonus": 4, "price_gold": 200,
        "desc": "+4 к урону",
    },
    "boots_leather": {
        "slot": SLOT_BOOTS, "rarity": RARITY_RARE,
        "name": "Кожаные ботинки", "emoji": "👢",
        "atk_bonus": 12, "price_gold": 750,
        "desc": "+12 к урону",
    },
    "boots_shadow": {
        "slot": SLOT_BOOTS, "rarity": RARITY_EPIC,
        "name": "Ботинки Тени", "emoji": "🌑",
        "atk_bonus": 25, "price_gold": 0, "price_diamonds": 15,
        "desc": "+25 к урону",
    },
    # ── КОЛЬЦО ───────────────────────────────────────────────
    "ring_copper": {
        "slot": SLOT_RING1, "rarity": RARITY_COMMON,
        "name": "Медное кольцо", "emoji": "💍",
        "crit_bonus": 3, "price_gold": 250,
        "desc": "+3 к интуиции (крит)",
    },
    "ring_silver": {
        "slot": SLOT_RING1, "rarity": RARITY_RARE,
        "name": "Серебряное кольцо", "emoji": "💍",
        "crit_bonus": 8, "price_gold": 900,
        "desc": "+8 к интуиции (крит)",
    },
    "ring_arcane": {
        "slot": SLOT_RING1, "rarity": RARITY_EPIC,
        "name": "Магическое кольцо", "emoji": "🔮",
        "crit_bonus": 18, "price_gold": 0, "price_diamonds": 20,
        "desc": "+18 к интуиции (крит)",
    },
}


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
        "atk_bonus": item.get("atk_bonus", 0),
        "def_pct":   item.get("def_pct", 0.0),
        "hp_bonus":  item.get("hp_bonus", 0),
        "crit_bonus": item.get("crit_bonus", 0),
    }
