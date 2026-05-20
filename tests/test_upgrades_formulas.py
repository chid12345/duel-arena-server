"""
tests/test_upgrades_formulas.py — формулы апгрейда предметов (этап 4A).

Покрывает:
- max_plus_for: правильные cap по тиру
- success_chance: 100% до +6, далее снижение, минимум 40%
- cost_to_upgrade_gold: рост с +N, разумные числа
- shards_cost_for: округление вверх
- dismantle_shards_for: T1→1, T4→12
- plus_stats_for: масштабирование статов, не мутирует исходник
- can_attempt_upgrade: блок на отсутствие tier и достижение cap
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from economy.upgrades_formulas import (  # noqa: E402
    can_attempt_upgrade,
    cost_to_upgrade_gold,
    dismantle_shards_for,
    max_plus_for,
    plus_stats_for,
    shards_cost_for,
    success_chance,
)


# ── max_plus_for ──────────────────────────────────────────────────────────────

def test_max_plus_for_known_tiers():
    """T1=5, T2=8, T3=10, T4=12 из balance_curve.json."""
    assert max_plus_for("T1") == 5
    assert max_plus_for("T2") == 8
    assert max_plus_for("T3") == 10
    assert max_plus_for("T4") == 12


def test_max_plus_for_unknown_tier():
    """Неизвестный тир → 0 (нельзя апгрейдить)."""
    assert max_plus_for("T9") == 0
    assert max_plus_for("") == 0


# ── success_chance ────────────────────────────────────────────────────────────

def test_success_chance_100pct_until_threshold():
    """До +6 (по умолчанию fail_chance_start) — всегда 100%."""
    for plus in range(1, 7):
        assert success_chance(plus) == 1.0, f"+{plus}: ожидали 100%, получили {success_chance(plus)}"


def test_success_chance_drops_after_threshold():
    """С +7 шанс снижается на 10% за шаг."""
    assert success_chance(7) == 0.90
    assert success_chance(8) == 0.80
    assert success_chance(10) == 0.60


def test_success_chance_minimum_40pct():
    """На +12 минимум 40% — нельзя застрять без шансов."""
    assert success_chance(12) == 0.40
    assert success_chance(20) == 0.40  # cap даже если выше


# ── cost_to_upgrade_gold ──────────────────────────────────────────────────────

def test_cost_grows_with_plus():
    """+5 дороже +1 в несколько раз."""
    base = 1000
    c1 = cost_to_upgrade_gold(base, 1)
    c5 = cost_to_upgrade_gold(base, 5)
    c10 = cost_to_upgrade_gold(base, 10)
    assert c1 < c5 < c10


def test_cost_proportional_to_base_price():
    """Удвоение базовой цены → удвоение стоимости апгрейда."""
    c_low = cost_to_upgrade_gold(1000, 5)
    c_high = cost_to_upgrade_gold(2000, 5)
    assert abs(c_high - 2 * c_low) <= 1  # ±1 на округлении


def test_cost_minimum_1g():
    """Даже при 0 base — хотя бы 1g (нельзя бесплатно)."""
    assert cost_to_upgrade_gold(0, 1) == 1


def test_cost_known_values():
    """Сверка с ожидаемой кривой 0.20 + 0.15×N от базы 1000."""
    assert cost_to_upgrade_gold(1000, 1) == 350    # 35% от 1000
    assert cost_to_upgrade_gold(1000, 5) == 950    # 95% от 1000
    assert cost_to_upgrade_gold(1000, 12) == 2000  # 200% от 1000


# ── shards_cost_for ───────────────────────────────────────────────────────────

def test_shards_cost_minimum_1():
    """+1 — минимум 1 шард."""
    assert shards_cost_for(1) == 1


def test_shards_cost_grows_slowly():
    """+12 — 6 шардов (target_plus // 2)."""
    assert shards_cost_for(12) == 6
    assert shards_cost_for(8) == 4


# ── dismantle_shards_for ──────────────────────────────────────────────────────

def test_dismantle_shards_per_tier():
    """T1→1, T2→3, T3→6, T4→12 — эконом-кривая разборки."""
    assert dismantle_shards_for("T1") == 1
    assert dismantle_shards_for("T2") == 3
    assert dismantle_shards_for("T3") == 6
    assert dismantle_shards_for("T4") == 12
    assert dismantle_shards_for("T9") == 0


# ── plus_stats_for ────────────────────────────────────────────────────────────

def test_plus_stats_zero_returns_copy():
    """+0 — копия без изменений."""
    item = {"atk_bonus": 10, "hp_bonus": 100, "name": "Шлем"}
    result = plus_stats_for(item, 0)
    assert result == item
    assert result is not item, "Должна быть копия, не тот же объект"


def test_plus_stats_per_tier_mythic_strongest():
    """Сила прокачки целых статов растёт по тиру: мифическая (T4, +15%/ур) > обычной (T1, +6%/ур)."""
    base = {"str_bonus": 12}
    t1 = plus_stats_for({**base, "tier": "T1"}, 5)["str_bonus"]  # 12×1.30=15.6→16, мин 17 → 17
    t4 = plus_stats_for({**base, "tier": "T4"}, 5)["str_bonus"]  # 12×1.75=21
    assert t1 == 17
    assert t4 == 21
    assert t4 > t1


def test_plus_stats_min_plus_one_per_level():
    """Целочисленный стат растёт минимум на +1 за уровень, даже если % даёт меньше."""
    # base 5, T1 (+6%): 5×1.3≈6.5 по %, но минимум 5+5=10 → берём 10
    item = {"atk_bonus": 5, "tier": "T1"}
    result = plus_stats_for(item, 5)
    assert result["atk_bonus"] == 10


def test_plus_stats_tier_param_overrides():
    """tier можно передать аргументом (для «голых» статов из get_item_stats)."""
    stats = {"hp_bonus": 100}  # без поля tier
    r = plus_stats_for(stats, 5, tier="T4")  # 100×(1+0.15×5)=175
    assert r["hp_bonus"] == 175


def test_plus_stats_pct_gentler_than_int():
    """% статы качаются МЯГКО (отдельный pct-шаг), не как целые — иначе улетают."""
    # T4: целый шаг 0.15, процентный 0.05. +12: целое ×2.8, проценты ×1.6.
    item = {"def_pct": 0.14, "hp_bonus": 100, "tier": "T4"}
    r = plus_stats_for(item, 12)
    assert abs(r["def_pct"] - 0.224) < 0.0001   # 0.14 × (1 + 0.05×12) = 0.224 (не 0.64!)
    assert r["hp_bonus"] == 280                  # 100 × (1 + 0.15×12) = 280


def test_plus_stats_scales_pct_stats():
    """% статы — мягкий множитель (pct-шаг), без правила «минимум +1»."""
    item = {"def_pct": 0.10, "lifesteal_pct": 5, "tier": "T1"}  # pct +2%/ур → ×1.10
    result = plus_stats_for(item, 5)
    assert abs(result["def_pct"] - 0.11) < 0.0001
    assert abs(result["lifesteal_pct"] - 5.5) < 0.0001


def test_plus_stats_does_not_mutate_source():
    item = {"atk_bonus": 10}
    _ = plus_stats_for(item, 5)
    assert item["atk_bonus"] == 10


def test_plus_stats_keeps_non_stat_fields():
    """Поля name, emoji, tier, price_gold и т.п. не трогаются."""
    item = {
        "atk_bonus": 10, "name": "Тест", "emoji": "🗡",
        "tier": "T2", "rarity": "rare", "price_gold": 8000,
    }
    result = plus_stats_for(item, 3)
    assert result["name"] == "Тест"
    assert result["emoji"] == "🗡"
    assert result["tier"] == "T2"
    assert result["rarity"] == "rare"
    assert result["price_gold"] == 8000


# ── can_attempt_upgrade ───────────────────────────────────────────────────────

def test_can_attempt_t1_first_upgrade():
    item = {"tier": "T1"}
    ok, _ = can_attempt_upgrade(item, current_plus=0)
    assert ok is True


def test_can_attempt_blocked_at_max_plus():
    """T1 max+5 — попытка +6 заблокирована."""
    item = {"tier": "T1"}
    ok, reason = can_attempt_upgrade(item, current_plus=5)
    assert ok is False
    assert "максимум" in reason.lower()


def test_can_attempt_no_tier_blocked():
    """Legacy предмет без tier — нельзя апгрейдить."""
    item = {"name": "Меч железный"}  # нет tier
    ok, reason = can_attempt_upgrade(item, current_plus=0)
    assert ok is False
    assert "tier" in reason.lower()
