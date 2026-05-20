"""
tests/test_set_bonus_apply.py — применение сет-бонусов в бою (_apply_set_bonus).

Раньше в бою применялись только hp_pct/atk_pct/accuracy, остальное (крит,
уворот, пробой, двойной, защита) терялось, и считался только ОДИН сет.
Эти тесты фиксируют что теперь применяются ВСЕ статы ВСЕХ активных сетов.
"""
from __future__ import annotations

from battle_system.mixins.set_perks import BattleSetPerksMixin


class _Setp(BattleSetPerksMixin):
    pass


_M = _Setp()

_SLOTS = ["belt", "armor2", "weapon", "shield", "boots", "ring1"]


def _eq(*pairs):
    """Строит equipped из пар (set_id, count). Раскидывает по слотам."""
    out = {}
    i = 0
    for set_id, n in pairs:
        for _ in range(n):
            out[_SLOTS[i]] = {"item_id": f"{set_id}_{i}", "set_id": set_id}
            i += 1
    return out


def _player():
    return {"crit": 10, "max_hp": 1000, "current_hp": 1000}


# ── одиночные архетипы: проверяем каждый стат ────────────────────────────────

def test_predator_4_applies_crit_and_atk():
    """Хищник 4/6 = +10 крит, +3% урон."""
    p = _player()
    _M._apply_set_bonus(p, _eq(("predator", 4)))
    assert p["crit"] == 20            # 10 + 10
    assert p["_eq_atk_pct"] == 3


def test_bastion_4_applies_hp_and_def():
    """Бастион 4/6 = +8% HP, +0.04 защита."""
    p = _player()
    _M._apply_set_bonus(p, _eq(("bastion", 4)))
    assert p["max_hp"] == 1080        # +8%
    assert abs(p["_eq_def_pct"] - 0.04) < 1e-9


def test_ghost_4_applies_dodge_and_accuracy():
    """Призрак 4/6 = +8% уворот (в _eq_dodge_bonus), +8% точность."""
    p = _player()
    _M._apply_set_bonus(p, _eq(("ghost", 4)))
    assert p["_eq_dodge_bonus"] == 8
    assert p["_eq_accuracy"] == 8


def test_mage_4_applies_pen_and_atk():
    """Маг 4/6 = +0.06 пробой брони, +3% урон."""
    p = _player()
    _M._apply_set_bonus(p, _eq(("mage", 4)))
    assert abs(p["_eq_pen_pct"] - 0.06) < 1e-9
    assert p["_eq_atk_pct"] == 3


def test_predator_6_applies_double_and_perk():
    """Хищник 6/6 = +18 крит, +8% урон, +5% двойной, перк frenzy_on_crit."""
    p = _player()
    _M._apply_set_bonus(p, _eq(("predator", 6)))
    assert p["crit"] == 28            # 10 + 18
    assert p["_eq_atk_pct"] == 8
    assert p["_eq_double_pct"] == 5
    assert p["_set_perk_id"] == "frenzy_on_crit"


# ── мультисет: несколько активных одновременно ───────────────────────────────

def test_multi_set_aggregates():
    """2 Хищник + 2 Бастион = крит Хищника + HP Бастиона одновременно."""
    p = _player()
    _M._apply_set_bonus(p, _eq(("predator", 2), ("bastion", 2)))
    assert p["crit"] == 14            # 10 + 4 (predator 2/6)
    assert p["max_hp"] == 1030        # +3% (bastion 2/6)


def test_no_active_sets_no_change():
    """Меньше 2 одинаковых — бонусов нет."""
    p = _player()
    _M._apply_set_bonus(p, _eq(("predator", 1), ("bastion", 1)))
    assert p["crit"] == 10
    assert p["max_hp"] == 1000
    assert p.get("_set_perk_id") is None
