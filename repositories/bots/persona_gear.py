"""Подбор виртуального гардероба бота: реальные item_id из каталога,
смешанные по редкости в зависимости от статуса.

Возвращает {slot: item_id} + суммарные _eq_* поля от выбранных предметов.
"""

from __future__ import annotations

import random
from collections import defaultdict
from typing import Dict, List, Tuple

from db_schema.equipment_catalog import EQUIPMENT_CATALOG, get_item_stats


# Слоты, которые имеет смысл одевать (ring2 опускаем — большинство ботов
# с одним кольцом, как настоящие игроки).
SLOTS_FOR_BOT = ("weapon", "shield", "armor", "belt", "boots", "ring1")

# Шансы редкостей по статусу. Веса в порядке (common, rare, epic, mythic).
# Сумма = 1. Mythic-слоты для armor отсутствуют в каталоге — fallback на epic.
RARITY_WEIGHTS_BY_PERSONA: Dict[str, Tuple[float, float, float, float]] = {
    "novice":  (0.85, 0.15, 0.00, 0.00),
    "farmer":  (0.20, 0.70, 0.10, 0.00),
    "major":   (0.05, 0.30, 0.55, 0.10),
    "donator": (0.00, 0.10, 0.40, 0.50),
}

RARITY_ORDER = ("common", "rare", "epic", "mythic")
RARITY_LABEL = {
    "common": "Обычное",
    "rare":   "Редкое",
    "epic":   "Эпическое",
    "mythic": "Мифическое",
}
RARITY_COLOR = {
    "common": "#9aa0a6",
    "rare":   "#3cc864",
    "epic":   "#b45aff",
    "mythic": "#ffc83c",
}


def _index_catalog() -> Dict[str, Dict[str, List[str]]]:
    """{slot: {rarity: [item_id, ...]}} — построение индекса один раз."""
    idx: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
    for iid, item in EQUIPMENT_CATALOG.items():
        slot = item.get("slot")
        rar = item.get("rarity")
        if slot and rar:
            idx[slot][rar].append(iid)
    return idx


_CATALOG_INDEX: Dict[str, Dict[str, List[str]]] = _index_catalog()


def _pick_rarity(persona: str, rng: random.Random) -> str:
    weights = RARITY_WEIGHTS_BY_PERSONA.get(persona, RARITY_WEIGHTS_BY_PERSONA["novice"])
    return rng.choices(RARITY_ORDER, weights=weights, k=1)[0]


def _pick_item_for_slot(slot: str, persona: str, rng: random.Random) -> str | None:
    """Выбрать item_id для слота: сначала редкость по статусу, потом fallback вниз."""
    desired = _pick_rarity(persona, rng)
    available = _CATALOG_INDEX.get(slot, {})
    # Сначала ищем точное совпадение редкости
    if desired in available and available[desired]:
        return rng.choice(available[desired])
    # Fallback: ниже по шкале (mythic→epic→rare→common)
    idx = RARITY_ORDER.index(desired)
    for step in range(idx - 1, -1, -1):
        rar = RARITY_ORDER[step]
        if rar in available and available[rar]:
            return rng.choice(available[rar])
    # Ничего нет — слот пустой
    return None


def _accumulate_eq_stats(items: Dict[str, str]) -> Dict:
    """Сложить статы выбранных предметов в формат _eq_* (как у игрока в start.py)."""
    total = {
        "_eq_atk_bonus":     0,
        "_eq_def_pct":       0.0,
        "_eq_pen_pct":       0.0,
        "_eq_dodge_bonus":   0,
        "_eq_regen_bonus":   0,
        "_eq_lifesteal_pct": 0,
        "_eq_crit_resist_pct": 0,
        "_eq_double_pct":    0,
        "_eq_accuracy":      0,
        "_eq_anti_dodge_pct": 0,
        "_eq_silence_pct":   0,
        "_eq_slow_pct":      0,
    }
    extra = {"hp_bonus": 0, "str_bonus": 0, "agi_bonus": 0, "intu_bonus": 0, "crit_bonus": 0}
    for iid in items.values():
        s = get_item_stats(iid)
        total["_eq_atk_bonus"]      += s.get("atk_bonus", 0)
        total["_eq_def_pct"]        += s.get("def_pct", 0.0)
        total["_eq_pen_pct"]        += s.get("pen_pct", 0.0)
        total["_eq_dodge_bonus"]    += s.get("dodge_bonus", 0)
        total["_eq_regen_bonus"]    += s.get("regen_bonus", 0)
        total["_eq_lifesteal_pct"]  += s.get("lifesteal_pct", 0)
        total["_eq_crit_resist_pct"] += s.get("crit_resist_pct", 0)
        total["_eq_double_pct"]     += s.get("double_pct", 0)
        total["_eq_accuracy"]       += s.get("accuracy", 0)
        total["_eq_anti_dodge_pct"] += s.get("anti_dodge_pct", 0)
        total["_eq_silence_pct"]    += s.get("silence_pct", 0)
        total["_eq_slow_pct"]       += s.get("slow_pct", 0)
        extra["hp_bonus"]   += s.get("hp_bonus", 0)
        extra["str_bonus"]  += s.get("str_bonus", 0)
        extra["agi_bonus"]  += s.get("agi_bonus", 0)
        extra["intu_bonus"] += s.get("intu_bonus", 0)
        extra["crit_bonus"] += s.get("crit_bonus", 0)
    return {**total, "_extra": extra}


def pick_gear_for_persona(persona: str, level: int,
                          rng: random.Random | None = None) -> Tuple[Dict[str, str], Dict]:
    """Подобрать смешанный гардероб + посчитать суммарные _eq_* статы.

    Возвращает (items, stats):
      items = {"weapon": "weapon_sword_epic", "shield": "shield_gold1", ...}
      stats = {"_eq_atk_bonus": 70, "_eq_def_pct": 0.18, ..., "_extra": {hp/str/...}}
    """
    r = rng or random
    # На низких уровнях бот не одевает все слоты — экипировка появляется постепенно.
    lv = max(1, int(level))
    coverage = max(0.30, min(1.0, lv / 60.0 + 0.20))

    items: Dict[str, str] = {}
    for slot in SLOTS_FOR_BOT:
        # Шанс что слот вообще одет — растёт с уровнем
        if r.random() > coverage:
            continue
        # Новички редко имеют экипировку (даже если уровень высокий — это «новичок»)
        if persona == "novice" and r.random() > 0.50:
            continue
        iid = _pick_item_for_slot(slot, persona, r)
        if iid:
            items[slot] = iid

    stats = _accumulate_eq_stats(items)
    return items, stats


def items_for_ui(items: Dict[str, str]) -> List[Dict]:
    """Список словарей для фронта: [{slot, item_id, name, rarity, color}]."""
    out: List[Dict] = []
    for slot, iid in items.items():
        item = EQUIPMENT_CATALOG.get(iid, {})
        rar = item.get("rarity", "common")
        out.append({
            "slot": slot,
            "item_id": iid,
            "name": item.get("name", iid),
            "rarity": rar,
            "rarity_label": RARITY_LABEL.get(rar, rar),
            "color": RARITY_COLOR.get(rar, "#9aa0a6"),
        })
    return out
