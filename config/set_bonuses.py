"""Бонусы за комплект (set bonus) одной редкости.

Игрок собирает экипировку одной редкости в 6 категориях слотов:
  weapon, shield, armor, belt (шлем), boots, ring1 (одно кольцо).

Активный сет = редкость с НАИБОЛЬШИМ количеством надетых вещей.
При равенстве побеждает старшая редкость (common < rare < epic < mythic).
Бонус применяется только один — у победившей редкости, по порогу 3/4/5/6.

Перк за 6/6 — уникальная фишка для каждой редкости (см. SET_PERKS).
"""
from __future__ import annotations

from db_schema.equipment_catalog import (
    SLOT_WEAPON, SLOT_SHIELD, SLOT_ARMOR, SLOT_BELT, SLOT_BOOTS, SLOT_RING1,
    RARITY_COMMON, RARITY_RARE, RARITY_EPIC,
)

RARITY_MYTHIC = "mythic"

# Категории сета — 6 штук. ring2 НЕ считается (legacy, в UI скрыт).
SET_CATEGORIES = [SLOT_WEAPON, SLOT_SHIELD, SLOT_ARMOR, SLOT_BELT, SLOT_BOOTS, SLOT_RING1]

# Порядок старшинства редкостей (для разрешения равенства)
RARITY_ORDER = [RARITY_COMMON, RARITY_RARE, RARITY_EPIC, RARITY_MYTHIC]

SET_NAMES = {
    RARITY_COMMON: "Новобранец",
    RARITY_RARE:   "Герой",
    RARITY_EPIC:   "Чемпион",
    RARITY_MYTHIC: "Бог войны",
}

SET_EMOJI = {
    RARITY_COMMON: "🥈",
    RARITY_RARE:   "🥇",
    RARITY_EPIC:   "💎",
    RARITY_MYTHIC: "⭐",
}

# Бонусы. Ключ — кол-во надетых вещей одной редкости. Значение — словарь стат-бонусов.
#  hp_pct        — +% к max_hp
#  def_pct_bonus — +% к снижению входящего урона (добавляется к _eq_def_pct, как доля 0.05 = 5%)
#  atk_pct       — +% к итоговому урону
#  accuracy      — +% к шансу попадания (добавляется к _eq_accuracy)
SET_BONUSES: dict[str, dict[int, dict]] = {
    RARITY_COMMON: {
        3: {"hp_pct": 1, "def_pct_bonus": 0.01},
        4: {"hp_pct": 2, "def_pct_bonus": 0.02, "atk_pct": 1},
        5: {"hp_pct": 3, "def_pct_bonus": 0.03, "atk_pct": 2, "accuracy": 1},
        6: {"hp_pct": 4, "def_pct_bonus": 0.03, "atk_pct": 2, "accuracy": 2},
    },
    RARITY_RARE: {
        3: {"hp_pct": 3, "def_pct_bonus": 0.02, "atk_pct": 2},
        4: {"hp_pct": 4, "def_pct_bonus": 0.03, "atk_pct": 3, "accuracy": 1},
        5: {"hp_pct": 5, "def_pct_bonus": 0.04, "atk_pct": 4, "accuracy": 2},
        6: {"hp_pct": 6, "def_pct_bonus": 0.05, "atk_pct": 5, "accuracy": 3},
    },
    RARITY_EPIC: {
        3: {"hp_pct": 5, "def_pct_bonus": 0.04, "atk_pct": 4, "accuracy": 1},
        4: {"hp_pct": 7, "def_pct_bonus": 0.05, "atk_pct": 5, "accuracy": 2},
        5: {"hp_pct": 8, "def_pct_bonus": 0.06, "atk_pct": 6, "accuracy": 3},
        6: {"hp_pct": 10, "def_pct_bonus": 0.07, "atk_pct": 7, "accuracy": 4},
    },
    RARITY_MYTHIC: {
        3: {"hp_pct": 7, "def_pct_bonus": 0.05, "atk_pct": 5, "accuracy": 2},
        4: {"hp_pct": 9, "def_pct_bonus": 0.06, "atk_pct": 7, "accuracy": 3},
        5: {"hp_pct": 11, "def_pct_bonus": 0.08, "atk_pct": 9, "accuracy": 4},
        6: {"hp_pct": 13, "def_pct_bonus": 0.10, "atk_pct": 11, "accuracy": 5},
    },
}

# Перки активируются ТОЛЬКО при 6/6 этой редкости (полная сборка).
SET_PERKS = {
    RARITY_COMMON: "second_wind",      # Серебро — «Второе дыхание»
    RARITY_RARE:   "decisive_strike",  # Золото — «Решающий удар»
    RARITY_EPIC:   "cold_blood",       # Алмаз — «Хладнокровие»
    RARITY_MYTHIC: "gods_wrath",       # Донат — «Гнев богов»
}

PERK_INFO = {
    "second_wind": {
        "name": "Второе дыхание",
        "desc": "Раз в бой: при HP ниже 30% мгновенно +100 HP",
    },
    "decisive_strike": {
        "name": "Решающий удар",
        "desc": "Первый удар в бою +50% урона",
    },
    "cold_blood": {
        "name": "Хладнокровие",
        "desc": "Каждый раунд +1% к твоему урону (до +10% за бой)",
    },
    "gods_wrath": {
        "name": "Гнев богов",
        "desc": "Каждый 5-й удар автоматически наносит x2 урона",
    },
}


def class_id_to_rarity(class_id: str | None) -> str | None:
    """Парсер суффикса class_id (гардероб/класс) в редкость сет-бонуса.

    Гардероб = броня в этой игре: tank_free → common, berserker_gold → rare,
    dragonknight_diamonds → epic, berserker_mythic / legendary_usdt → mythic.
    """
    if not class_id:
        return None
    cid = str(class_id)
    if cid.endswith("_mythic") or cid.endswith("_usdt"):
        return RARITY_MYTHIC
    if cid.endswith("_diamonds"):
        return RARITY_EPIC
    if cid.endswith("_gold"):
        return RARITY_RARE
    if cid.endswith("_free"):
        return RARITY_COMMON
    return None


def count_set_rarities(equipped: dict, current_class: str | None = None) -> dict[str, int]:
    """Кол-во надетых вещей по редкости. Считаются только 6 категорий SET_CATEGORIES.

    Армор-слот (SLOT_ARMOR) в этой игре заполняется через гардероб/класс
    (`players.current_class`), а не через `player_equipment.armor`. Поэтому если
    передан current_class — для armor-слота используется его редкость.
    """
    counts: dict[str, int] = {}
    armor_rarity = class_id_to_rarity(current_class)
    for slot in SET_CATEGORIES:
        if slot == SLOT_ARMOR:
            rarity = armor_rarity
        else:
            item = equipped.get(slot)
            rarity = item.get("rarity") if item else None
        if not rarity:
            continue
        counts[rarity] = counts.get(rarity, 0) + 1
    return counts


def _rarity_rank(r: str) -> int:
    try:
        return RARITY_ORDER.index(r)
    except ValueError:
        return -1


def resolve_active_set(equipped: dict, current_class: str | None = None) -> dict | None:
    """Определяет активный сет по правилу: больше вещей → побеждает.
    При равенстве — старшая редкость.

    Возвращает: {rarity, count, name, emoji, bonuses, perk} или None если порог < 3.
    """
    counts = count_set_rarities(equipped, current_class)
    if not counts:
        return None

    max_count = max(counts.values())
    if max_count < 3:
        return None

    # Из всех редкостей с max_count берём старшую
    winners = [r for r, c in counts.items() if c == max_count]
    winner = max(winners, key=_rarity_rank)
    if winner not in SET_BONUSES:
        return None

    threshold = min(max_count, 6)  # порог не выше 6
    bonuses = SET_BONUSES[winner].get(threshold, {})
    perk = SET_PERKS[winner] if threshold >= 6 else None
    return {
        "rarity": winner,
        "count": max_count,
        "threshold": threshold,
        "name": SET_NAMES[winner],
        "emoji": SET_EMOJI[winner],
        "bonuses": bonuses,
        "perk": perk,
    }


def bonuses_human(bonuses: dict) -> list[str]:
    """Текстовый список бонусов для UI."""
    lines = []
    if bonuses.get("hp_pct"):
        lines.append(f"+{bonuses['hp_pct']}% HP")
    if bonuses.get("def_pct_bonus"):
        lines.append(f"+{int(bonuses['def_pct_bonus'] * 100)}% защита от урона")
    if bonuses.get("atk_pct"):
        lines.append(f"+{bonuses['atk_pct']}% урон")
    if bonuses.get("accuracy"):
        lines.append(f"+{bonuses['accuracy']}% точность")
    return lines
