"""
tests/test_upgrades_formulas.py — формулы апгрейда v2 (без шардов).

Покрывает:
- max_plus / max_plus_for_player: потолок 80 и замок по уровню игрока
- cost_pct: линейный рост 10%→60%
- upgrade_cost: известные числа в золоте и алмазах + переход валюты по уровню
- currency_for_level: какой тир с какого уровня платит алмазами
- free_roll_eligible: казино с +61, лимит на вещь
- plus_stats_for: 2%/ур для целых, мягче для процентов, без мутации
- can_attempt_upgrade: блок без tier, по потолку и по уровню игрока
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from economy.upgrades_formulas import (  # noqa: E402
    can_attempt_upgrade,
    cost_pct,
    currency_for_level,
    free_roll_eligible,
    max_plus,
    max_plus_for_player,
    plus_stats_for,
    upgrade_cost,
)


# ── потолок и замок по уровню ─────────────────────────────────────────────────

def test_max_plus_is_80():
    assert max_plus() == 80


def test_max_plus_for_player_caps_at_level():
    """Качать можно только до своего уровня, но не выше 80."""
    assert max_plus_for_player(10) == 10
    assert max_plus_for_player(80) == 80
    assert max_plus_for_player(200) == 80
    assert max_plus_for_player(0) == 0


# ── кривая цены ───────────────────────────────────────────────────────────────

def test_cost_pct_endpoints():
    assert abs(cost_pct(1) - 0.10) < 1e-9
    assert abs(cost_pct(80) - 0.60) < 1e-9


def test_cost_pct_monotonic():
    assert cost_pct(1) < cost_pct(40) < cost_pct(80)


# ── стоимость попытки (золото и алмазы) ───────────────────────────────────────

def test_upgrade_cost_gold_known_values():
    """Серебро (T1): +1 = 81g, +80 = 486g (база 810, всё за золото)."""
    assert upgrade_cost("T1", 1) == (81, "gold")
    assert upgrade_cost("T1", 80) == (486, "gold")


def test_upgrade_cost_gold_tier2_start():
    """Золото (T2): +1 = 146g (база 1458 × 10%)."""
    assert upgrade_cost("T2", 1) == (146, "gold")


def test_upgrade_cost_switches_to_diamonds():
    """Золото (T2): +60 ещё золото, +61 уже алмазы (~10💠)."""
    amount60, cur60 = upgrade_cost("T2", 60)
    assert cur60 == "gold"
    amount61, cur61 = upgrade_cost("T2", 61)
    assert cur61 == "diamond"
    assert amount61 == 10


def test_upgrade_cost_donate_diamond_tail():
    """Донат (T4): +20 золото, +21 алмазы (14💠), +80 = 36💠."""
    assert upgrade_cost("T4", 20)[1] == "gold"
    assert upgrade_cost("T4", 21) == (14, "diamond")
    assert upgrade_cost("T4", 80) == (36, "diamond")


# ── валюта по уровню ──────────────────────────────────────────────────────────

def test_currency_for_level_per_tier():
    assert currency_for_level("T1", 80) == "gold"      # серебро всегда золото
    assert currency_for_level("T2", 60) == "gold"
    assert currency_for_level("T2", 61) == "diamond"
    assert currency_for_level("T3", 30) == "gold"
    assert currency_for_level("T3", 31) == "diamond"
    assert currency_for_level("T4", 20) == "gold"
    assert currency_for_level("T4", 21) == "diamond"


# ── казино (бесплатный ап) ────────────────────────────────────────────────────

def test_free_roll_eligible_only_from_61():
    assert free_roll_eligible(60, 0) is False
    assert free_roll_eligible(61, 0) is True


def test_free_roll_eligible_limited_per_item():
    """Максимум 3 бесплатных на вещь."""
    assert free_roll_eligible(70, 2) is True
    assert free_roll_eligible(70, 3) is False


# ── рост статов ───────────────────────────────────────────────────────────────

def test_plus_stats_zero_returns_copy():
    item = {"atk_bonus": 10, "hp_bonus": 100, "name": "Шлем"}
    result = plus_stats_for(item, 0)
    assert result == item
    assert result is not item


def test_plus_stats_int_two_percent_per_level():
    """Целые статы: ×(1 + 0.02×N). +50 → ×2.0, +80 → ×2.6."""
    assert plus_stats_for({"atk_bonus": 10}, 50)["atk_bonus"] == 20
    assert plus_stats_for({"hp_bonus": 100}, 80)["hp_bonus"] == 260


def test_plus_stats_uniform_across_tiers():
    """Множитель не зависит от тира — рост одинаковый, разница только в базе."""
    t1 = plus_stats_for({"str_bonus": 50, "tier": "T1"}, 80)["str_bonus"]
    t4 = plus_stats_for({"str_bonus": 50, "tier": "T4"}, 80)["str_bonus"]
    assert t1 == t4 == 130  # 50 × 2.6


def test_plus_stats_pct_gentler_than_int():
    """Процентные статы растут мягче (0.8%/ур): +80 → ×1.64, не ×2.6."""
    r = plus_stats_for({"def_pct": 0.14, "hp_bonus": 100}, 80)
    assert abs(r["def_pct"] - 0.2296) < 1e-4  # 0.14 × 1.64
    assert r["hp_bonus"] == 260


def test_plus_stats_does_not_mutate_source():
    item = {"atk_bonus": 10}
    _ = plus_stats_for(item, 50)
    assert item["atk_bonus"] == 10


def test_plus_stats_keeps_non_stat_fields():
    item = {"atk_bonus": 10, "name": "Тест", "tier": "T2", "rarity": "rare"}
    result = plus_stats_for(item, 30)
    assert result["name"] == "Тест"
    assert result["tier"] == "T2"
    assert result["rarity"] == "rare"


# ── можно ли апгрейдить ───────────────────────────────────────────────────────

def test_can_attempt_ok_within_level():
    ok, _ = can_attempt_upgrade({"tier": "T1"}, current_plus=0, player_level=80)
    assert ok is True


def test_can_attempt_blocked_by_player_level():
    """Уровень игрока 2 — выше +2 не пустит."""
    ok, reason = can_attempt_upgrade({"tier": "T1"}, current_plus=2, player_level=2)
    assert ok is False
    assert "уровень" in reason.lower()


def test_can_attempt_blocked_at_global_max():
    ok, reason = can_attempt_upgrade({"tier": "T4"}, current_plus=80, player_level=80)
    assert ok is False
    assert "максимум" in reason.lower()


def test_can_attempt_no_tier_blocked():
    ok, reason = can_attempt_upgrade({"name": "Меч железный"}, current_plus=0, player_level=80)
    assert ok is False
    assert "tier" in reason.lower()
