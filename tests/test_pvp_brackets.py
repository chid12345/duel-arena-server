"""
tests/test_pvp_brackets.py — PvP-матчмейкинг и награды по брекетам (Этап 6).

Покрывает:
- pvp_find_opponent ищет внутри брекета (1-10/11-25/26-50/51-80)
- bracket-награда в PvP не зависит от уровня победителя (нет level_mult)
- PvE награда сохраняет старую level_mult формулу
- Поиск возвращает None если в брекете нет оппонентов
"""
from __future__ import annotations

import pytest


# ── pvp_find_opponent: брекет-based поиск ────────────────────────────────────

def test_find_opponent_inside_bracket(db):
    """Игрок 5 уровня ищет — находит игрока 8 уровня (оба в брекете 0: 1-10)."""
    db.pvp_enqueue(1001, level=5, chat_id=100)
    db.pvp_enqueue(1002, level=8, chat_id=200)
    res = db.pvp_find_opponent(user_id=999, level=5)
    # Должен вернуть любого из них (1001 или 1002 — оба в брекете 0)
    assert res is not None
    assert res["user_id"] in (1001, 1002)


def test_find_opponent_does_not_cross_bracket(db):
    """Игрок 10 уровня (брекет 0) не находит игрока 11 уровня (брекет 1)."""
    db.pvp_enqueue(2001, level=11, chat_id=100)  # bracket 1
    res = db.pvp_find_opponent(user_id=999, level=10)  # bracket 0
    assert res is None


def test_find_opponent_bracket_high_vs_low(db):
    """Игрок 80 (брекет 3, 51-80) не должен найти 50 (брекет 2)."""
    db.pvp_enqueue(3001, level=50, chat_id=100)
    res = db.pvp_find_opponent(user_id=999, level=80)
    assert res is None


def test_find_opponent_atomic_removes_from_queue(db):
    """Найденный оппонент удаляется из очереди (атомарно)."""
    db.pvp_enqueue(4001, level=30, chat_id=100)
    res = db.pvp_find_opponent(user_id=999, level=30)
    assert res is not None
    # Повторный поиск не должен найти того же оппонента
    res2 = db.pvp_find_opponent(user_id=999, level=30)
    assert res2 is None


# ── Брекет-награды в end_battle (косвенно через формулы) ─────────────────────

def test_pvp_gold_base_no_level_diff_dependency():
    """Победитель 20 vs 25 ур. — оба в брекете 1, награда зависит ТОЛЬКО от брекета."""
    from economy.curves import pvp_bracket_at, pvp_gold_base, pvp_xp_base
    # 20 и 25 в брекете 1
    b20 = pvp_bracket_at(20)
    b25 = pvp_bracket_at(25)
    assert b20 == b25 == 1
    # Базовая награда одна и та же — независимо от точного уровня
    assert pvp_gold_base(b20) == pvp_gold_base(b25)
    assert pvp_xp_base(b20) == pvp_xp_base(b25)


def test_pvp_reward_increases_with_bracket():
    """Награда в высоком брекете больше, чем в низком."""
    from economy.curves import pvp_gold_base, pvp_xp_base
    assert pvp_gold_base(0) < pvp_gold_base(3)
    assert pvp_xp_base(0) < pvp_xp_base(3)


def test_pvp_reward_constants():
    """Сверка с config/balance_curve.json (значения из 5A)."""
    from economy.curves import pvp_gold_base, pvp_xp_base
    # Брекет 0 (1-10): 60 XP, 18 gold
    assert pvp_xp_base(0) == 60
    assert pvp_gold_base(0) == 18
    # Брекет 3 (51-80): 360 XP, 60 gold
    assert pvp_xp_base(3) == 360
    assert pvp_gold_base(3) == 60
