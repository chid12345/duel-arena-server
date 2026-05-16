"""Resolver активных сетов по надетой экипировке (Этап 5A).

Принимает словарь equipped {slot: {item_id, set_id, ...}} (как из
db.get_equipment) и возвращает список активных сетов с порогом и бонусами.

Несколько сетов могут быть активны одновременно — каждый со своим порогом.
Перк (7) — только при полном составе одного сета.
"""
from __future__ import annotations

from typing import Any

from config.sets_catalog_v2 import SETS_V2

# Игра имеет 6 слотов экипировки (голова, тело, оружие, щит, ноги, кольцо).
# ring2 — legacy, скрыт в UI и не считается в сет-бонусах.
_THRESHOLDS = (2, 4, 6)


def _max_threshold(count: int) -> int:
    """Самый высокий порог 2/4/6, достигнутый при count предметах. 0 если <2."""
    achieved = 0
    for t in _THRESHOLDS:
        if count >= t:
            achieved = t
    return achieved


def resolve_active_sets(equipped: dict[str, dict]) -> list[dict[str, Any]]:
    """Список активных сетов: [{set_id, name, emoji, count, threshold, bonuses}].

    Активным считается сет с count >= 3. Порог = max(3,5,7) для count.
    Bonuses — словарь стат-бонусов из SETS_V2[set_id].thresholds[threshold].
    Perk_id есть только в bonuses порога 7.
    """
    if not equipped:
        return []
    counts: dict[str, int] = {}
    for slot, item in equipped.items():
        if not isinstance(item, dict):
            continue
        sid = item.get("set_id")
        if not sid:
            continue
        counts[str(sid)] = counts.get(str(sid), 0) + 1

    results: list[dict[str, Any]] = []
    for sid, count in counts.items():
        meta = SETS_V2.get(sid)
        if not meta:
            continue
        threshold = _max_threshold(count)
        if threshold == 0:
            continue
        bonuses = dict(meta["thresholds"].get(threshold, {}))
        results.append({
            "set_id": sid,
            "name": meta["name"],
            "emoji": meta["emoji"],
            "count": count,
            "threshold": threshold,
            "bonuses": bonuses,
        })
    return results


def aggregate_set_bonuses(active_sets: list[dict[str, Any]]) -> dict[str, float]:
    """Сложить все стат-бонусы со всех активных сетов.

    Возвращает {hp_pct, atk_pct, def_pct, crit_bonus, dodge_bonus,
    accuracy, pen_pct, double_pct, perks: [perk_id, ...]}.
    """
    total = {
        "hp_pct": 0.0, "atk_pct": 0.0, "def_pct": 0.0,
        "crit_bonus": 0, "dodge_bonus": 0,
        "accuracy": 0, "pen_pct": 0.0, "double_pct": 0,
        "perks": [],
    }
    for s in active_sets:
        b = s.get("bonuses") or {}
        for k, v in b.items():
            if k == "perk_id":
                total["perks"].append(str(v))
                continue
            if k == "perk_desc":
                continue
            if k in total and isinstance(total[k], (int, float)) and isinstance(v, (int, float)):
                if isinstance(total[k], float) or isinstance(v, float):
                    total[k] = float(total[k]) + float(v)
                else:
                    total[k] = int(total[k]) + int(v)
    return total
