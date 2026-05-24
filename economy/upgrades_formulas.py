"""
economy/upgrades_formulas.py — формулы апгрейда предметов (система v2, без шардов).

Чистые функции, без БД и UI. Используются:
- repositories/equipment/equipment_repo.py — учёт +N в статах
- api/upgrade_handler.py — попытка апгрейда
- handlers/ui_helpers/upgrade_ui.py — меню в боте

Модель (все якоря — config/balance_curve.json/upgrades):
- Уровень вещи 0..max_plus(80). Потолок попытки = min(80, уровень игрока).
- Стат растёт на stat_step_pct (2%) от базы за каждый +N (целые статы),
  проценты (защита%/крит-сопр%) — мягче, pct_step_pct (0.8%). Без «минимум +1»:
  на +80 целые статы ≈ ×2.6, проценты ≈ ×1.64.
- Цена попытки = база_тира × процент(уровень). Процент линейно растёт от
  cost_pct_start (10%) на +1 до cost_pct_end (60%) на +80.
  Базы тиров: T1=810, T2=1458, T3=2592, T4=4455 (серебро × множитель тира).
- Валюта зависит от тира и уровня (diamond_from_level): начиная с этого уровня
  платим алмазами, до — золотом. Алмазы = округление вверх от золото ÷ курс (75).
- «Доброе казино»: с free_roll_from_level (61) есть free_roll_chance (10%) шанс,
  что апгрейд пройдёт бесплатно. Не больше free_roll_max_per_item (3) раз на вещь.
"""
from __future__ import annotations

import math
from typing import Any

from economy.curves import upgrades_config
from economy.loader import get_anchor

# Поля стата, которые масштабируются с +N. Целочисленные:
_INT_STATS = (
    "atk_bonus", "hp_bonus", "crit_bonus", "dodge_bonus", "regen_bonus",
    "str_bonus", "agi_bonus", "intu_bonus", "accuracy",
)
# Поля % (хранятся как float или int). Масштабируются мягче и округляются:
_PCT_STATS = (
    "def_pct", "pen_pct", "lifesteal_pct", "crit_resist_pct",
    "double_pct", "gold_pct", "xp_pct",
    "anti_dodge_pct", "silence_pct", "slow_pct", "regen_speed_pct",
)


def max_plus() -> int:
    """Глобальный потолок уровня вещи (80)."""
    return int(upgrades_config().get("max_plus", 80))


def max_plus_for_player(player_level: int) -> int:
    """Максимальный +N, доступный игроку: min(потолок, его уровень).

    Вещь нельзя качать выше своего уровня — это главный замок прогресса.
    """
    return min(max_plus(), max(0, int(player_level)))


def _stat_step() -> float:
    return float(upgrades_config().get("stat_step_pct", 0.02))


def _pct_step() -> float:
    return float(upgrades_config().get("pct_step_pct", 0.008))


def cost_pct(level: int) -> float:
    """Процент от базы тира за попытку до +level. Линейно start→end по уровням."""
    cfg = upgrades_config()
    start = float(cfg.get("cost_pct_start", 0.10))
    end = float(cfg.get("cost_pct_end", 0.60))
    cap = max(1, max_plus())
    n = min(max(1, int(level)), cap)
    if cap <= 1:
        return start
    return start + (end - start) * (n - 1) / (cap - 1)


def tier_base_gold(tier: str | None) -> int:
    """Базовая цена тира для расчёта апгрейда (T1=810 … T4=4455)."""
    bases = upgrades_config().get("tier_base_gold") or {}
    return int(bases.get(str(tier), 0))


def gold_to_diamond_rate() -> int:
    """Курс: сколько золота в 1 алмазе (из economy.json/anchor, обычно 75)."""
    return max(1, int(get_anchor("GOLD_TO_DIAMOND")))


def currency_for_level(tier: str | None, level: int) -> str:
    """Чем платим за апгрейд до +level: 'gold' или 'diamond'.

    diamond_from_level задаёт, с какого уровня тир переходит на алмазы.
    """
    cfg = upgrades_config()
    threshold = (cfg.get("diamond_from_level") or {}).get(str(tier))
    if threshold is None:
        return "gold"
    return "diamond" if int(level) >= int(threshold) else "gold"


def upgrade_cost(tier: str | None, target_level: int) -> tuple[int, str]:
    """Стоимость попытки апгрейда до +target_level: (сумма, валюта).

    Сначала считаем цену в золоте (база тира × процент), затем, если уровень
    оплачивается алмазами, переводим золото в алмазы (вверх, минимум 1).
    """
    gold = round(tier_base_gold(tier) * cost_pct(int(target_level)))
    currency = currency_for_level(tier, int(target_level))
    if currency == "diamond":
        amount = max(1, math.ceil(gold / gold_to_diamond_rate()))
    else:
        amount = max(1, int(gold))
    return amount, currency


def free_roll_from_level() -> int:
    return int(upgrades_config().get("free_roll_from_level", 61))


def free_roll_chance() -> float:
    return float(upgrades_config().get("free_roll_chance", 0.25))


def free_roll_max_per_item() -> int:
    return int(upgrades_config().get("free_roll_max_per_item", 3))


def free_roll_eligible(target_level: int, free_used: int) -> bool:
    """Доступен ли «бесплатный» ролл для уровня (без учёта случайности).

    Только с free_roll_from_level и пока лимит бесплатных на вещь не исчерпан.
    """
    return (
        int(target_level) >= free_roll_from_level()
        and int(free_used) < free_roll_max_per_item()
    )


def plus_stats_for(item: dict, plus_level: int, tier: str | None = None) -> dict:
    """item-подобный dict со статами, увеличенными на +N.

    Целые статы ×(1 + stat_step × N), процентные ×(1 + pct_step × N). tier не
    влияет на множитель (единый рост для всех редкостей — баланс держится за счёт
    разной базы). Параметр оставлен для совместимости вызовов. Не мутирует исходник.
    """
    result = dict(item)
    n = int(plus_level)
    if n <= 0:
        return result
    int_mult = 1.0 + _stat_step() * n
    pct_mult = 1.0 + _pct_step() * n
    for stat in _INT_STATS:
        if stat in result and isinstance(result[stat], (int, float)):
            result[stat] = round(float(result[stat]) * int_mult)
    for stat in _PCT_STATS:
        if stat in result and isinstance(result[stat], (int, float)):
            result[stat] = round(float(result[stat]) * pct_mult, 4)
    return result


def can_attempt_upgrade(item: dict, current_plus: int, player_level: int) -> tuple[bool, str]:
    """Можно ли апгрейд от +current_plus до +(current_plus+1)? (можно, причина).

    Блок: нет tier (legacy), достигнут глобальный потолок, или цель выше уровня игрока.
    """
    tier = item.get("tier")
    if not tier:
        return False, "Legacy предмет не апгрейдится (нет tier)"
    target = int(current_plus) + 1
    if target > max_plus():
        return False, f"Достигнут максимум +{max_plus()}"
    if target > max_plus_for_player(player_level):
        return False, f"Нужен уровень {target} (качать можно только до своего уровня)"
    return True, ""
