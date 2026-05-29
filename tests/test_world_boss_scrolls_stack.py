"""tests/test_world_boss_scrolls_stack.py — стакание ВСЕХ 5 рейд-свитков.

Покрывает (Закон 11):
1) Передача scrolls=[...] списком — мультипликаторы складываются по всем 5.
2) damage_mult стакается мультипликативно (×1.25 × ×1.10 = ×1.375).
3) dodge_bonus и crit_chance_bonus — аддитивно.
4) Legacy scroll_1+scroll_2 ещё работает (обратная совместимость).
5) Пустой список / None / отсутствие свитков — без эффектов (×1.0).

Запуск: python -m pytest tests/test_world_boss_scrolls_stack.py -v
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class _FixedRng:
    """Детерминистский «rng»: возвращает заданное число для random()."""
    def __init__(self, val: float): self._val = val
    def random(self) -> float: return self._val


def test_collect_mults_all_5_scrolls_stack():
    """Все 5 свитков активны одновременно: damage стакается мультипликативно,
    бонусы dodge/crit — аддитивно. damage_25*power_10 = 1.25*1.10 = 1.375."""
    from repositories.world_boss.damage_calc import _collect_raid_mults
    m = _collect_raid_mults("damage_25", "power_10", "defense_20", "dodge_10", "crit_10")
    assert m["damage_mult"] == pytest.approx(1.25 * 1.10)
    assert m["defense_mult"] == pytest.approx(1.20)
    assert m["dodge_bonus"] == pytest.approx(0.10)
    assert m["crit_chance_bonus"] == pytest.approx(0.10)


def test_collect_mults_empty_no_effect():
    """Без свитков — все мультипликаторы нейтральны."""
    from repositories.world_boss.damage_calc import _collect_raid_mults
    m = _collect_raid_mults()
    assert m["damage_mult"] == 1.0
    assert m["defense_mult"] == 1.0
    assert m["dodge_bonus"] == 0.0
    assert m["crit_chance_bonus"] == 0.0


def test_player_damage_with_5_scrolls_list_arg():
    """calc_player_damage_to_boss с scrolls=[...] списком должен применить
    ВСЕ свитки. С damage_25+power_10 урон по боссу ×1.375."""
    from repositories.world_boss.damage_calc import calc_player_damage_to_boss
    stats = {"strength": 100, "crit": 0}
    profile = {"str": 1.0, "agi": 1.0, "int": 1.0}
    # Без свитков: base=100 / boss_agi=1 = 100
    plain, _, _ = calc_player_damage_to_boss(stats, profile, scrolls=[], rng=_FixedRng(0.99))
    # Со всеми 5: ×1.375 (только damage_mult: damage_25+power_10)
    boosted, _, _ = calc_player_damage_to_boss(
        stats, profile,
        scrolls=["damage_25", "power_10", "defense_20", "dodge_10", "crit_10"],
        rng=_FixedRng(0.99),
    )
    # При rng=0.99 нет крита (crit_chance макс ~0.30 даже с бустом). Проверяем
    # что урон вырос примерно ×1.375 (с учётом int-конверсии — допускаем ±2).
    assert boosted >= int(plain * 1.30)
    assert boosted <= int(plain * 1.40) + 2


def test_legacy_slot_1_slot_2_still_works():
    """Обратная совместимость: старый интерфейс scroll_1+scroll_2 без scrolls=[]
    должен по-прежнему работать (старые player_state с slot_1/2)."""
    from repositories.world_boss.damage_calc import calc_player_damage_to_boss
    stats = {"strength": 100, "crit": 0}
    profile = {"str": 1.0, "agi": 1.0, "int": 1.0}
    legacy, _, _ = calc_player_damage_to_boss(
        stats, profile, scroll_1="damage_25", scroll_2="power_10",
        rng=_FixedRng(0.99),
    )
    # То же что и через scrolls=[]
    new, _, _ = calc_player_damage_to_boss(
        stats, profile, scrolls=["damage_25", "power_10"],
        rng=_FixedRng(0.99),
    )
    assert legacy == new


def test_scrolls_list_overrides_legacy():
    """Если переданы И scrolls=[], И scroll_1/2 — приоритет у scrolls."""
    from repositories.world_boss.damage_calc import calc_player_damage_to_boss
    stats = {"strength": 100, "crit": 0}
    profile = {"str": 1.0, "agi": 1.0, "int": 1.0}
    # scrolls=[] (пусто) — никаких бустов, даже если slot_1/2 указаны
    d, _, _ = calc_player_damage_to_boss(
        stats, profile,
        scroll_1="damage_25", scroll_2="power_10",
        scrolls=[],  # пусто → legacy игнор
        rng=_FixedRng(0.99),
    )
    plain, _, _ = calc_player_damage_to_boss(stats, profile, rng=_FixedRng(0.99))
    assert d == plain  # без свитков


def test_boss_attack_5_scrolls_defense_and_dodge_stack():
    """В calc_boss_attack_damage: defense_20 снижает урон, dodge_10 даёт +10%
    уворот. С scrolls=[defense_20, dodge_10] и rng>0.10 урон уменьшается,
    с rng<0.10 — уворот."""
    from repositories.world_boss.damage_calc import calc_boss_attack_damage
    ps = {"max_hp": 1000, "endurance": 10}
    profile = {"str": 1.0, "agi": 1.0}
    # rng=0.99: уворот не сработает, должна быть уменьшенная защита
    d_no_def, dodged_no, _ = calc_boss_attack_damage(
        ps, profile, scrolls=[], rng=_FixedRng(0.99),
    )
    d_with_def, dodged_w, _ = calc_boss_attack_damage(
        ps, profile, scrolls=["defense_20"], rng=_FixedRng(0.99),
    )
    assert dodged_no is False and dodged_w is False
    assert d_with_def < d_no_def  # защита работает

    # rng=0.05: с dodge_10 (+10% уворот) шанс ~10%+ → должно увернуться
    _, dodged_dodge, _ = calc_boss_attack_damage(
        ps, profile, scrolls=["dodge_10"], rng=_FixedRng(0.05),
    )
    assert dodged_dodge is True
