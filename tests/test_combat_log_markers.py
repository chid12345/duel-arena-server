"""tests/test_combat_log_markers.py — значки механик в WebApp-логе боя.

Сервер (_webapp_log_line) обязан выдавать понятные значки для двойного удара,
пролома, поглощения, стойки, частичного блока и вампиризма — иначе игрок видит
просто «−N» и не понимает, что произошло. Стойка = 🏰 (НЕ 🛡, иначе фронт спутает
её с полным блоком).
"""
from __future__ import annotations

from battle_system.mixins.combat_log import BattleCombatLogMixin


def _line(out1, dmg1=50, **kw):
    return BattleCombatLogMixin._webapp_log_line(
        3, out1, "hit", dmg1, 40,
        atk_zone1="ТУЛОВИЩЕ", atk_zone2="ГОЛОВА",
        hp_target1_after=300, hp_target2_after=250, **kw,
    )


def test_double_marker():
    assert "×2" in _line("double")


def test_break_marker():
    assert "🪓" in _line("hit_break")


def test_guard_marker():
    assert "🧱" in _line("guard")


def test_partial_marker():
    assert "▪" in _line("partial")


def test_crit_marker():
    assert "⚡" in _line("crit")


def test_fortress_uses_castle_not_shield():
    """Стойка показывается как 🏰 и НЕ как 🛡 (чтобы фронт не принял её за блок)."""
    line = _line("fortress", dmg1=1)
    assert "🏰" in line
    assert "🛡" not in line


def test_real_block_still_shield():
    assert "🛡блок" in _line("block", dmg1=0)


def test_lifesteal_marker_present():
    assert "🩸+12" in _line("hit", p1_heal=12)


def test_combo_crit_double():
    line = _line("crit_double")
    assert "⚡" in line and "×2" in line
