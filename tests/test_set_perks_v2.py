"""
tests/test_set_perks_v2.py — новые архетипные перки (Этап 5C).

Покрывает _apply_set_perks_pre для 5 новых перков:
- blood_rage (berserk): HP<50% → +30% atk
- frenzy_on_crit (predator): +10% atk (упрощённо)
- phantom_strike (ghost): +5 dodge
- arcane_burst (mage): +5% pen
- kings_will (regent): первый раунд → +20% HP, раз в бой
"""
from __future__ import annotations

import pytest

from battle_system.mixins.set_perks import BattleSetPerksMixin


class _Setp(BattleSetPerksMixin):
    """Тестовый mixin-инстанс."""


_M = _Setp()


def _battle():
    return {"player1": {}, "player2": {}}


# ── blood_rage ────────────────────────────────────────────────────────────────

def test_blood_rage_inactive_above_50_hp():
    """HP > 50% — perk не активен, atk_pct не изменяется."""
    p = {"_set_perk_id": "blood_rage", "current_hp": 80, "max_hp": 100, "_eq_atk_pct": 5}
    _M._apply_set_perks_pre(_battle(), p, "p1", round_num=1)
    assert p["_eq_atk_pct"] == 5


def test_blood_rage_active_below_50_hp():
    """HP < 50% — +30% к atk_pct."""
    p = {"_set_perk_id": "blood_rage", "current_hp": 40, "max_hp": 100, "_eq_atk_pct": 5}
    _M._apply_set_perks_pre(_battle(), p, "p1", round_num=1)
    assert p["_eq_atk_pct"] == 35  # 5 + 30


# ── frenzy_on_crit ────────────────────────────────────────────────────────────

def test_frenzy_on_crit_adds_10_pct():
    p = {"_set_perk_id": "frenzy_on_crit", "current_hp": 100, "max_hp": 100}
    _M._apply_set_perks_pre(_battle(), p, "p1", round_num=1)
    assert p.get("_eq_atk_pct") == 10


# ── phantom_strike ────────────────────────────────────────────────────────────

def test_phantom_strike_adds_5_dodge():
    p = {"_set_perk_id": "phantom_strike", "current_hp": 100, "max_hp": 100}
    _M._apply_set_perks_pre(_battle(), p, "p1", round_num=1)
    assert p.get("_eq_dodge") == 5


# ── arcane_burst ──────────────────────────────────────────────────────────────

def test_arcane_burst_adds_pen():
    p = {"_set_perk_id": "arcane_burst", "current_hp": 100, "max_hp": 100}
    _M._apply_set_perks_pre(_battle(), p, "p1", round_num=1)
    assert abs(p.get("_eq_pen_pct", 0) - 0.05) < 0.0001


# ── kings_will ────────────────────────────────────────────────────────────────

def test_kings_will_heals_on_first_round():
    """В первом раунде +20% от max HP, флаг устанавливается."""
    b = _battle()
    p = {"_set_perk_id": "kings_will", "current_hp": 50, "max_hp": 100}
    _M._apply_set_perks_pre(b, p, "p1", round_num=1)
    assert p["current_hp"] == 70  # 50 + 20
    # Повторный вызов — не лечит снова
    _M._apply_set_perks_pre(b, p, "p1", round_num=1)
    assert p["current_hp"] == 70  # не изменилось


def test_kings_will_not_triggered_on_later_rounds():
    """Если перк не сработал на 1 раунде — на 3 уже не активирует."""
    b = _battle()
    p = {"_set_perk_id": "kings_will", "current_hp": 50, "max_hp": 100}
    _M._apply_set_perks_pre(b, p, "p1", round_num=3)
    # round > 1 → не лечит
    assert p["current_hp"] == 50


def test_kings_will_caps_at_max_hp():
    """Лечение не превышает max_hp."""
    b = _battle()
    p = {"_set_perk_id": "kings_will", "current_hp": 95, "max_hp": 100}
    _M._apply_set_perks_pre(b, p, "p1", round_num=1)
    assert p["current_hp"] == 100  # cap


# ── unknown perk — no-op ──────────────────────────────────────────────────────

def test_unknown_perk_no_op():
    """Неизвестный perk_id — ничего не делает (защита)."""
    p = {"_set_perk_id": "nonexistent_perk", "current_hp": 50, "max_hp": 100, "_eq_atk_pct": 7}
    _M._apply_set_perks_pre(_battle(), p, "p1", round_num=1)
    assert p["_eq_atk_pct"] == 7


def test_no_perk_id_no_op():
    """Если _set_perk_id отсутствует — ничего не делает."""
    p = {"current_hp": 50, "max_hp": 100}
    _M._apply_set_perks_pre(_battle(), p, "p1", round_num=1)
    assert "_eq_atk_pct" not in p
