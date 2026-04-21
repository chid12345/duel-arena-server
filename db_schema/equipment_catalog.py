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
