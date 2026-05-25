"""
tests/test_hp_regen_cap.py — потолок скорости регена HP.

Баг: множитель скорости регена рос без предела (+5% за каждое вложение в
выносливость), поэтому прокачанный в HP игрок восстанавливался за секунды,
и порог «в бой только с 70% HP» не успевал сработать. Потолок ×2.5 →
полный реген не быстрее ~2 минут даже у макс-аккаунта.
"""
from __future__ import annotations

from config import (
    HP_REGEN_BASE_SECONDS,
    HP_REGEN_ENDURANCE_BONUS,
    HP_REGEN_SPEED_MULT_MAX,
    hp_regen_multiplier,
)


def test_no_investment_is_base_speed():
    assert hp_regen_multiplier(0) == 1.0


def test_small_investment_below_cap_scales():
    # 10 вложений × 5% = +50% → ×1.5 (ещё под потолком)
    assert abs(hp_regen_multiplier(10) - 1.5) < 1e-9


def test_huge_investment_is_capped():
    # 1000 вложений дали бы ×51 — но потолок режет до 2.5
    assert hp_regen_multiplier(1000) == HP_REGEN_SPEED_MULT_MAX


def test_gear_speed_counts_but_capped():
    # выносливость 40 (×3) + гир 100% (+1) = 4.0 → режется до 2.5
    assert hp_regen_multiplier(40, 100) == HP_REGEN_SPEED_MULT_MAX


def test_capped_full_regen_not_faster_than_2min():
    # При полном потолке полный реген = база / 2.5 ≈ 120с
    full = HP_REGEN_BASE_SECONDS / hp_regen_multiplier(99999)
    assert full >= 110, f"полный реген {full:.0f}с — быстрее ~2 мин, потолок не работает"


def test_cap_constant_sane():
    assert 2.0 <= HP_REGEN_SPEED_MULT_MAX <= 3.0
    assert HP_REGEN_ENDURANCE_BONUS == 0.05
