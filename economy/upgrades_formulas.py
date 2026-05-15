"""
economy/upgrades_formulas.py — формулы апгрейда предметов (этап 4A).

Без БД, без UI — чистые функции. Используются:
- repositories/upgrades/ — apply_upgrade, dismantle (4B)
- battle_system/mixins/damage.py — учитывает +N в статах (4C)
- api/upgrade_handler.py — эндпоинт (4D)

Якоря — из config/balance_curve.json/upgrades через economy.curves.upgrades_config:
- max_plus_per_tier: {T1: 5, T2: 8, T3: 10, T4: 12}
- stat_step_pct: 0.08 (8% за каждый +N)
- fail_chance_start: 6 (с +7 начинается риск провала)

Стоимость попытки: pct = 0.20 + 0.15 × target_plus от базовой цены предмета.
Шанс успеха: 100% до +6, далее −10% за каждый шаг, минимум 40% на +12.
При провале — потеря денег и шардов, +N не меняется (мягкая модель).
"""
from __future__ import annotations

from typing import Any

from economy.curves import upgrades_config

# Поля стата, которые масштабируются с +N. Целочисленные:
_INT_STATS = (
    "atk_bonus", "hp_bonus", "crit_bonus", "dodge_bonus", "regen_bonus",
    "str_bonus", "agi_bonus", "intu_bonus", "accuracy",
)
# Поля % (хранятся как float или int). Масштабируются и округляются:
_PCT_STATS = (
    "def_pct", "pen_pct", "lifesteal_pct", "crit_resist_pct",
    "double_pct", "gold_pct", "xp_pct",
    "anti_dodge_pct", "silence_pct", "slow_pct", "regen_speed_pct",
)

# Шарды от разборки по тиру: T1 = 1, T2 = 3, T3 = 6, T4 = 12.
_DISMANTLE_SHARDS = {"T1": 1, "T2": 3, "T3": 6, "T4": 12}


def max_plus_for(tier: str) -> int:
    """Максимальный +N для тира (T1=5, T2=8, T3=10, T4=12)."""
    cfg = upgrades_config()
    cap = cfg.get("max_plus_per_tier") or {}
    return int(cap.get(str(tier), 0))


def success_chance(target_plus: int) -> float:
    """Шанс успеха для попытки апгрейда до +N (0..1).

    До fail_chance_start (по умолчанию 6) — всегда 100%. После — снижается
    на 10% за шаг, минимум 40% (на +12 для T4).
    """
    fail_start = int(upgrades_config().get("fail_chance_start", 6))
    if target_plus <= fail_start:
        return 1.0
    excess = target_plus - fail_start
    return max(0.4, 1.0 - 0.10 * excess)


def shards_cost_for(target_plus: int) -> int:
    """Сколько шардов нужно для попытки апгрейда до +N (одного тира)."""
    return max(1, target_plus // 2)


def cost_to_upgrade_gold(base_price_gold: int, target_plus: int) -> int:
    """Стоимость попытки апгрейда в золоте.

    Формула: pct = 0.20 + 0.15 × target_plus от base_price.
    На +1: 35% от цены, на +5: 95%, на +10: 170%, на +12: 200%.
    """
    pct = 0.20 + 0.15 * float(target_plus)
    return max(1, round(float(base_price_gold) * pct))


def dismantle_shards_for(tier: str) -> int:
    """Сколько шардов даёт разборка предмета указанного тира."""
    return int(_DISMANTLE_SHARDS.get(str(tier), 0))


def plus_stats_for(item: dict, plus_level: int) -> dict:
    """Возвращает item-подобный dict со статами, увеличенными на (1 + step × N).

    step берётся из upgrades_config().stat_step_pct (default 0.08).
    Не мутирует исходник. Целочисленные статы округляются, % — до 4 знаков.
    Если plus_level <= 0 — возвращает копию без изменений.
    """
    result = dict(item)
    n = int(plus_level)
    if n <= 0:
        return result
    step = float(upgrades_config().get("stat_step_pct", 0.08))
    mult = 1.0 + step * n
    for stat in _INT_STATS:
        if stat in result and isinstance(result[stat], (int, float)):
            result[stat] = round(float(result[stat]) * mult)
    for stat in _PCT_STATS:
        if stat in result and isinstance(result[stat], (int, float)):
            result[stat] = round(float(result[stat]) * mult, 4)
    return result


def can_attempt_upgrade(item: dict, current_plus: int) -> tuple[bool, str]:
    """Можно ли попробовать апгрейд от +current_plus до +(current_plus+1)?

    Возвращает (можно, причина-если-нет).
    """
    tier = item.get("tier")
    if not tier:
        return False, "У предмета нет tier"
    cap = max_plus_for(tier)
    if cap <= 0:
        return False, f"Тир {tier} не поддерживает апгрейды"
    target = int(current_plus) + 1
    if target > cap:
        return False, f"Достигнут максимум +{cap} для {tier}"
    return True, ""


if __name__ == "__main__":
    print("=== Кривая апгрейдов ===")
    for tier in ("T1", "T2", "T3", "T4"):
        cap = max_plus_for(tier)
        print(f"\n{tier} max+{cap}:")
        # Базовая цена предмета — для примера power=27 (T1 free), power=59 (T2)…
        # Здесь упрощённо: 810g для T1, 7965g для T2, ~5700g для T3, ~44k для T4
        base_gold = {"T1": 810, "T2": 7965, "T3": 5775, "T4": 44325}[tier]
        for plus in range(1, cap + 1):
            cost = cost_to_upgrade_gold(base_gold, plus)
            shards = shards_cost_for(plus)
            chance = success_chance(plus)
            print(f"  +{plus:2d}: cost={cost:>6d}g, shards={shards} {tier}, chance={chance*100:.0f}%")
