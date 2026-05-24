"""
tests/test_balance_curves.py — кривые баланса по уровню (этап 1 редизайна).

Покрывает:
- загрузку и валидацию config/balance_curve.json,
- монотонность кривой мощи,
- разблокировку тиров (T1@1, T2@20, T3@45, T4@65),
- 4 PvP-брекета (1-10 / 11-25 / 26-50 / 51-80),
- якорь 35 дней до 80 уровня (с допуском),
- доход золота/PU растёт с брекетом,
- премиум-эффекты, апгрейды, сеты.

Чистые функции — БД не нужна.
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from economy.curves import (  # noqa: E402
    days_to_reach,
    gold_per_pu_at,
    is_tier_unlocked,
    load_curves,
    max_level,
    power_at,
    premium_effects,
    pvp_bracket_at,
    pvp_bracket_range,
    pvp_gold_base,
    pvp_xp_base,
    sets_catalog,
    tier_unlocked_at,
    tiers_available_at,
    upgrades_config,
)


# ── Загрузка и валидация ──────────────────────────────────────────────────────

def test_curves_json_loads_with_all_80_levels():
    """balance_curve.json должен содержать ровно 80 уровней, без пропусков."""
    data = load_curves()
    assert data["anchor"]["max_level"] == 80
    assert len(data["by_level"]) == 80
    levels = [r["level"] for r in data["by_level"]]
    assert levels == list(range(1, 81)), "Уровни должны быть 1..80 без дыр"


def test_max_level_is_80():
    assert max_level() == 80


# ── Монотонность мощи ─────────────────────────────────────────────────────────

def test_power_curve_monotonic():
    """power_at(L+1) >= power_at(L) для всех уровней (мощь не падает)."""
    prev = -1
    for lvl in range(1, max_level() + 1):
        p = power_at(lvl)
        assert p >= prev, f"Мощь упала на уровне {lvl}: {prev} -> {p}"
        prev = p


# ── Тиры ──────────────────────────────────────────────────────────────────────

def test_tier_unlocks_at_expected_levels():
    """T1 с 1, T2 с 20, T3 с 45, T4 с 65 — соответствует решению пользователя."""
    assert is_tier_unlocked(1, "T1") is True
    assert is_tier_unlocked(19, "T2") is False
    assert is_tier_unlocked(20, "T2") is True
    assert is_tier_unlocked(44, "T3") is False
    assert is_tier_unlocked(45, "T3") is True
    assert is_tier_unlocked(64, "T4") is False
    assert is_tier_unlocked(65, "T4") is True


def test_tier_unlocked_at_returns_max_tier():
    """tier_unlocked_at(L) возвращает САМЫЙ ВЫСОКИЙ тир, доступный на уровне."""
    assert tier_unlocked_at(1) == "T1"
    assert tier_unlocked_at(20) == "T2"
    assert tier_unlocked_at(50) == "T3"
    assert tier_unlocked_at(80) == "T4"


def test_tiers_available_includes_lower_tiers():
    """На 80 уровне доступны все 4 тира, на 1 — только T1."""
    assert tiers_available_at(1) == ["T1"]
    assert tiers_available_at(20) == ["T1", "T2"]
    assert tiers_available_at(45) == ["T1", "T2", "T3"]
    assert tiers_available_at(65) == ["T1", "T2", "T3", "T4"]


def test_unknown_tier_returns_false():
    assert is_tier_unlocked(80, "T5") is False


# ── PvP-брекеты ──────────────────────────────────────────────────────────────

def test_pvp_bracket_assignment():
    """4 интервала: 1-10, 11-25, 26-50, 51-80."""
    assert pvp_bracket_at(1) == 0
    assert pvp_bracket_at(10) == 0
    assert pvp_bracket_at(11) == 1
    assert pvp_bracket_at(25) == 1
    assert pvp_bracket_at(26) == 2
    assert pvp_bracket_at(50) == 2
    assert pvp_bracket_at(51) == 3
    assert pvp_bracket_at(80) == 3


def test_pvp_bracket_range():
    assert pvp_bracket_range(0) == (1, 10)
    assert pvp_bracket_range(3) == (51, 80)
    with pytest.raises(ValueError):
        pvp_bracket_range(99)


def test_pvp_rewards_grow_with_bracket():
    """Базовая награда XP и золота растёт с номером брекета (высокие уровни — больше)."""
    xp_prev, gold_prev = 0, 0
    for b in range(4):
        xp = pvp_xp_base(b)
        gold = pvp_gold_base(b)
        assert xp > xp_prev, f"XP не выросло: брекет {b}, {xp_prev} -> {xp}"
        assert gold > gold_prev, f"Золото не выросло: брекет {b}, {gold_prev} -> {gold}"
        xp_prev, gold_prev = xp, gold


# ── Якорь 35 дней ────────────────────────────────────────────────────────────

def test_anchor_days_to_max_level_matches():
    """Дни до 80 уровня должны совпадать с якорем CONFIG (допуск ±1 день).

    Текущий якорь читается из balance_curve.json — `anchor.days_to_max_level`.
    Если CONFIG в tools/balance_xlsx_export.py изменили — заново запустить
    `python -m tools.balance_xlsx_export`.
    """
    target = load_curves()["anchor"]["days_to_max_level"]
    actual = days_to_reach(80)
    assert abs(actual - target) <= 1.0, (
        f"Калибровка нарушена: цель {target} дней, факт {actual} дней"
    )


def test_days_to_reach_monotonic():
    """Дни до уровня растут монотонно."""
    prev = -0.01
    for lvl in range(1, max_level() + 1):
        d = days_to_reach(lvl)
        assert d >= prev, f"Дни упали на уровне {lvl}: {prev} -> {d}"
        prev = d


# ── Доход ─────────────────────────────────────────────────────────────────────

def test_gold_per_pu_grows_across_brackets():
    """Золото/PU на 80 уровне выше, чем на 1 (поздние уровни богаче)."""
    assert gold_per_pu_at(80) > gold_per_pu_at(1)
    assert gold_per_pu_at(1) > 0


# ── Премиум, апгрейды, сеты ───────────────────────────────────────────────────

def test_premium_effects_present():
    eff = premium_effects()
    assert eff["xp_buff"] == 1.25
    assert eff["gold_buff"] == 1.25
    assert eff["inventory_extra_slots"] >= 1
    assert eff["wb_cooldown_reduction_pct"] >= 0


def test_upgrades_config_v2_shape():
    cfg = upgrades_config()
    assert cfg["max_plus"] == 80
    assert 0 < cfg["stat_step_pct"] < 1
    assert 0 < cfg["pct_step_pct"] < cfg["stat_step_pct"]  # проценты растут мягче
    assert cfg["cost_pct_start"] < cfg["cost_pct_end"]
    # Базы тиров растут по редкости, валюта-порог задан для всех тиров
    bases = cfg["tier_base_gold"]
    assert bases["T1"] < bases["T2"] < bases["T3"] < bases["T4"]
    assert set(cfg["diamond_from_level"]) == {"T1", "T2", "T3", "T4"}
    assert 0 < cfg["free_roll_chance"] < 1
    assert cfg["free_roll_max_per_item"] >= 1


def test_sets_catalog_has_six_sets():
    sets = sets_catalog()
    assert len(sets) == 6, "Должно быть 6 архетипных сетов"
    ids = {s["id"] for s in sets}
    assert ids == {"predator", "bastion", "berserk", "ghost", "mage", "regent"}
