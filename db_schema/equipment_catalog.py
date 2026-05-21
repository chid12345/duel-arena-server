"""Каталог предметов экипировки — aggregator.

Этап 3B редизайна: данные предметов разнесены по слотам в
db_schema/equipment_items/ (Закон 1). Этот файл — короткий aggregator
+ helper-функции + константы слотов/редкостей (для обратной совместимости
внешних импортов вида `from db_schema.equipment_catalog import EQUIPMENT_CATALOG`).
"""
from __future__ import annotations

from db_schema.equipment_items import _default_set_id, all_equipment_items
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
SLOT_ARMOR2 = "armor2"
SLOT_BELT   = "belt"
SLOT_BOOTS  = "boots"
SLOT_RING1  = "ring1"
SLOT_RING2  = "ring2"

# Старый SLOT_ARMOR снесён под корень — заменён на SLOT_ARMOR2 (чистая реализация).
ALL_SLOTS = [SLOT_WEAPON, SLOT_SHIELD, SLOT_ARMOR2, SLOT_BELT, SLOT_BOOTS, SLOT_RING1, SLOT_RING2]

SLOT_LABEL = {
    SLOT_WEAPON: ("🗡️", "Оружие"),
    SLOT_SHIELD: ("🛡️", "Щит"),
    SLOT_ARMOR2: ("🛡", "Броня"),
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
# Weapons из weapon_catalog.py — те же шаблоны item_id (sword_free1, axe_gold2 ...).
# Применяем тот же детерминированный маппинг set_id (этап 5B).
for _wid, _witem in WEAPON_CATALOG.items():
    if "set_id" not in _witem:
        _sid = _default_set_id(_wid)
        EQUIPMENT_CATALOG[_wid] = {**_witem, "set_id": _sid} if _sid else dict(_witem)
    else:
        EQUIPMENT_CATALOG[_wid] = _witem


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
    "body_def_pct",   # зональная защита тела (броня armor2)
    "reflect_pct",    # шипы — отражение урона (броня №1)
    "block_chance",   # глухой блок — шанс погасить удар (броня №2)
)


def get_item_stats(item_id: str) -> dict:
    """Возвращает только боевые бонусы предмета (нули по дефолту)."""
    item = EQUIPMENT_CATALOG.get(item_id, {})
    return {f: item.get(f, 0.0 if "pct" in f else 0) for f in _STATS_FIELDS}
