"""Каталог предметов экипировки — aggregator.

Этап 3B редизайна: данные предметов разнесены по слотам в
db_schema/equipment_items/ (Закон 1). Этот файл — короткий aggregator
+ helper-функции + константы слотов/редкостей (для обратной совместимости
внешних импортов вида `from db_schema.equipment_catalog import EQUIPMENT_CATALOG`).
"""
from __future__ import annotations

from db_schema.equipment_items import all_equipment_items
from db_schema.weapon_catalog import WEAPON_CATALOG

# ── Редкости ─────────────────────────────────────────────────────────────────

RARITY_COMMON = "common"
RARITY_RARE   = "rare"
RARITY_EPIC   = "epic"

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

# ── Слоты ────────────────────────────────────────────────────────────────────

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
    SLOT_BELT:   ("⛑️", "Шлем"),
    SLOT_BOOTS:  ("👟", "Ботинки"),
    SLOT_RING1:  ("💍", "Кольцо 1"),
    SLOT_RING2:  ("💍", "Кольцо 2"),
}

# ── Каталог: собирается из подмодулей equipment_items/ + weapon_catalog ──────
# Статы предмета: atk_bonus, def_pct, hp_bonus, crit_bonus, pen_pct,
# dodge_bonus, regen_bonus, lifesteal_pct, crit_resist_pct, str/agi/intu_bonus,
# double_pct, gold_pct, xp_pct, accuracy, anti_dodge_pct, silence_pct,
# slow_pct, regen_speed_pct.

EQUIPMENT_CATALOG: dict[str, dict] = all_equipment_items()
EQUIPMENT_CATALOG.update(WEAPON_CATALOG)


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_item(item_id: str) -> dict | None:
    return EQUIPMENT_CATALOG.get(item_id)


def get_items_for_slot(slot: str) -> list[dict]:
    return [
        {"id": k, **v}
        for k, v in EQUIPMENT_CATALOG.items()
        if v["slot"] == slot or (slot in (SLOT_RING1, SLOT_RING2) and v["slot"] == SLOT_RING1)
    ]


_STATS_FIELDS = (
    "atk_bonus", "def_pct", "hp_bonus", "crit_bonus", "pen_pct",
    "dodge_bonus", "regen_bonus", "lifesteal_pct", "crit_resist_pct",
    "str_bonus", "agi_bonus", "intu_bonus", "double_pct",
    "gold_pct", "xp_pct", "accuracy", "anti_dodge_pct",
    "silence_pct", "slow_pct", "regen_speed_pct",
)


def get_item_stats(item_id: str) -> dict:
    """Возвращает только боевые бонусы предмета (нули по дефолту)."""
    item = EQUIPMENT_CATALOG.get(item_id, {})
    return {f: item.get(f, 0.0 if "pct" in f else 0) for f in _STATS_FIELDS}
