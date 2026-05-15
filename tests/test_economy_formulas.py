"""
tests/test_economy_formulas.py — формулы валютной экономики.

Покрывает:
- конвертеры PU/gold/diamond,
- reward_for_task (грид и фолбек на формулу),
- price_for_item для всех валют,
- ev_for_box (overflow-предупреждение),
- apply_premium_gold (+25%).

Чистые функции — БД не нужна.
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from economy.formulas import (  # noqa: E402
    pu_to_gold,
    gold_to_diamond,
    reward_for_task,
    price_for_item,
    potion_price_for_hp,
    ev_for_box,
    apply_premium_gold,
)
from economy.loader import get_anchor, get_combat, get_combat_dict  # noqa: E402


# ── Конвертеры валют ─────────────────────────────────────────────────────────

def test_pu_to_gold_uses_anchor():
    """1 PU должен дать ровно PU_TO_GOLD золота из economy.json."""
    expected = round(get_anchor("PU_TO_GOLD"))
    assert pu_to_gold(1) == expected, f"Ожидали {expected}, получили {pu_to_gold(1)}"


def test_gold_to_diamond_rounds_up():
    """gold_to_diamond округляет ВВЕРХ (нет потерь при дробном результате).

    Пример: 75 gold = 1 алмаз; 76 gold = 2 алмаза (а не 1).
    Это критично — иначе игрок терял бы золото при конвертации.
    """
    rate = round(get_anchor("GOLD_TO_DIAMOND"))  # обычно 75
    assert gold_to_diamond(rate - 1) == 1, "rate-1 → 1 (округление вверх)"
    assert gold_to_diamond(rate) == 1, "ровно rate → 1"
    assert gold_to_diamond(rate + 1) == 2, "rate+1 → 2 (округление вверх)"
    assert gold_to_diamond(0) == 0, "0 → 0"


# ── Награда за задание ───────────────────────────────────────────────────────

def test_reward_for_task_uses_grid_first():
    """Когда клетка есть в reward_grid (калиброванные значения для существующих квестов),
    возвращается она, а не формульный фолбек."""
    # weekly/medium = [100, 1] согласно config/economy.json (rebalance 2026-05-15)
    g, d = reward_for_task("medium", "weekly")
    assert (g, d) == (100, 1), f"Ожидали (100, 1) из reward_grid, получили ({g}, {d})"


def test_reward_for_task_falls_back_to_formula(monkeypatch):
    """Если клетки нет в reward_grid, используется формула total_pu × split."""
    # Подменяем grid на пустой → форсируем формульный путь
    import economy.formulas as F

    monkeypatch.setattr(F, "get_reward_grid_cell", lambda freq, diff: None)
    g, d = reward_for_task("hard", "weekly")
    # hard×weekly = 2.0 × 1.5 = 3.0 PU; split weekly: gold=0.55, diamond=0.45
    # gold_pu = 1.65 → 495 gold; diam_pu = 1.35 → ≈5.4 алмаза
    assert g > 0 and d > 0, f"Формульный фолбек должен дать положительные числа, получили ({g}, {d})"
    assert g == pu_to_gold(2.0 * 1.5 * 0.55), "Формула gold должна совпадать"


# ── Цены ─────────────────────────────────────────────────────────────────────

def test_price_for_item_currencies_all_positive():
    """Цена 1 предмета power=10 редкости common тира T1 должна быть > 0 во всех валютах."""
    for cur in ("gold", "diamond", "star", "usdt"):
        p = price_for_item(10, "common", "T1", currency=cur)
        assert p > 0, f"Цена в валюте {cur!r} должна быть > 0, получили {p}"


# ── Цена зелья от max_hp ─────────────────────────────────────────────────────

def test_potion_price_for_hp_scales_with_max_hp():
    """Цена зелья растёт линейно с max_hp игрока.

    Анкер: power_score_per_max_hp=0.005 → 1 ур (max_hp=100): ~15g,
    80 ур (max_hp=1000): ~150g. На 80 уровне зелье в 10 раз дороже.
    """
    p1 = potion_price_for_hp("hp_full", 100)
    p80 = potion_price_for_hp("hp_full", 1000)
    assert 10 <= p1 <= 25, f"Новичок: ожидали 10-25g, получили {p1}g"
    assert 100 <= p80 <= 200, f"Ветеран: ожидали 100-200g, получили {p80}g"
    # Линейность: 10× max_hp → 10× цена (±1 на округлениях)
    assert abs(p80 / p1 - 10) <= 1, f"Масштаб должен быть ~10×, получили {p80/p1:.2f}"


def test_potion_price_unknown_raises():
    """Неизвестное зелье → KeyError из конфига."""
    with pytest.raises(KeyError):
        potion_price_for_hp("hp_nonexistent", 100)


# ── EV ящика ─────────────────────────────────────────────────────────────────

def test_ev_for_box_overflow_warned():
    """Если jackpot_chance × value > pool, overflow сигналит инфляцию."""
    res = ev_for_box(150, jackpot_chance=0.5, jackpot_value_gold=10000)
    assert res["jackpot_overflow_gold"] > 0, (
        f"Огромный джекпот должен дать overflow > 0, получили {res['jackpot_overflow_gold']}"
    )


# ── Балансные множители боя ──────────────────────────────────────────────────

def test_combat_pvp_winrate_bonus_present():
    """PvP-бонус ×1.30 должен быть в economy.json/combat."""
    assert get_combat("pvp_winrate_bonus") == 1.30


def test_combat_xp_boost_mult_present():
    """XP-буст ×1.5 — единственный источник правды."""
    assert get_combat("xp_boost_mult") == 1.5


def test_combat_bot_win_gold_multiplier_present():
    """Бот даёт меньше золота (анти-фарм PvE), коэффициент ×0.8."""
    assert get_combat("bot_win_gold_multiplier") == 0.8


def test_combat_pvp_repeat_factor_thresholds():
    """Anti-friend-farm: пороги 3 и 6 боёв, множители 0.5 и 0.2."""
    cfg = get_combat_dict("pvp_repeat_factor")
    assert cfg["threshold_low"] == 3
    assert cfg["factor_low"] == 0.5
    assert cfg["threshold_high"] == 6
    assert cfg["factor_high"] == 0.2


def test_combat_unknown_key_raises():
    with pytest.raises(KeyError):
        get_combat("nonexistent_key")


# ── Премиум ──────────────────────────────────────────────────────────────────

def test_apply_premium_gold_125pct():
    """Премиум +25% к золоту: 100 → 125."""
    assert apply_premium_gold(100) == 125, f"Ожидали 125, получили {apply_premium_gold(100)}"
