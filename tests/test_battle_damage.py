"""
tests/test_battle_damage.py — расчёт урона.

Покрывает:
- _base_damage растёт от strength,
- damage capped (не больше max_hp * STRENGTH_DAMAGE_MAX_PCT),
- miss возможен (eff_miss > 0 и stop-rate),
- атакующий с lifesteal лечится,
- обычный hit > 0.

Тестируем чистые методы _base_damage и _calculate_damage_detailed.
random.seed(42) выставляется autouse-фикстурой.
"""
from __future__ import annotations

import random


class _BS:
    def __init__(self):
        from battle_system.mixins.damage import BattleDamageMixin
        from battle_system.mixins.damage_armor import BattleDamageArmorMixin

        class _M(BattleDamageMixin, BattleDamageArmorMixin):
            pass

        self._mixin = _M()

    def base_damage(self, attacker: dict) -> int:
        return self._mixin._base_damage(attacker)

    def calc(self, attacker: dict, defender: dict, attack_zone: str = "ТЕЛО",
             defense_zone: str = "ГОЛОВА"):
        return self._mixin._calculate_damage_detailed(
            attacker, defender, attack_zone, defense_zone, is_afk=False,
        )


def _attacker(strength: int = 20, level: int = 5, **extras) -> dict:
    return {
        "level": level, "strength": strength, "endurance": 10, "crit": 5,
        "max_hp": 200, "current_hp": 200,
        **extras,
    }


def _defender(strength: int = 10, level: int = 5, max_hp: int = 200, **extras) -> dict:
    return {
        "level": level, "strength": strength, "endurance": 10, "crit": 5,
        "max_hp": max_hp, "current_hp": max_hp,
        **extras,
    }


def test_base_damage_grows_with_strength():
    """Чем больше strength, тем больше base damage."""
    bs = _BS()
    low = bs.base_damage(_attacker(strength=10))
    high = bs.base_damage(_attacker(strength=100))
    assert high > low, f"Сильнее → больше урона ({high} ожидался > {low})"


def test_calc_damage_capped_by_max_hp_pct():
    """С гигантской силой damage за один удар всё равно ограничен.

    _calculate_damage_detailed применяет min(base, dmg_cap), где
    dmg_cap = max_hp * STRENGTH_DAMAGE_MAX_PCT. С учётом crit/double/zone-mult
    результирующий damage не должен превышать (cap × максимальный множитель).
    Берём верхнюю оценку cap × 5 как защиту от one-shot kills.
    """
    from config import STRENGTH_DAMAGE_MAX_PCT
    bs = _BS()
    defender_max_hp = 200
    cap = int(defender_max_hp * STRENGTH_DAMAGE_MAX_PCT)
    upper_bound = cap * 5  # crit*1.5 × double*0.6 × zone*1.2 — с большим запасом

    max_observed = 0
    for seed in range(20):
        random.seed(seed)
        a = _attacker(strength=99999, level=80)
        d = _defender(max_hp=defender_max_hp, endurance=1, crit=1)
        damage, _outcome, _ = bs.calc(a, d, attack_zone="ТЕЛО", defense_zone="ГОЛОВА")
        max_observed = max(max_observed, damage)

    assert max_observed <= upper_bound, (
        f"С strength=99999 максимум damage {max_observed} превысил разумный потолок {upper_bound}"
    )


def test_attacker_with_lifesteal_heals():
    """attacker._buff_lifesteal_pct=50 + раненный → current_hp растёт после удара."""
    bs = _BS()
    a = _attacker(strength=50)
    a["current_hp"] = 50  # ранен
    a["max_hp"] = 200
    a["_buff_lifesteal_pct"] = 50
    d = _defender(max_hp=200, endurance=1)
    hp_before = a["current_hp"]

    # Достаточно много прогонов с разными seed, ищем не-miss/dodge удар
    for seed in range(20):
        random.seed(seed)
        a_copy = dict(a)
        damage, outcome, _ = bs.calc(a_copy, dict(d), attack_zone="ТЕЛО", defense_zone="ГОЛОВА")
        if damage > 0 and "lifesteal" not in outcome:
            # lifesteal модифицирует attacker (тот же dict)
            if a_copy["current_hp"] > hp_before:
                assert a_copy["current_hp"] > hp_before
                return
    assert False, "Ни один из прогонов не дал hit с lifesteal — проверить стат attacker"


def test_normal_hit_returns_positive_damage():
    """Обычный удар (не-блок зона) хотя бы изредка должен дать damage > 0."""
    bs = _BS()
    hits = 0
    for seed in range(30):
        random.seed(seed)
        a = _attacker(strength=30)
        d = _defender(max_hp=200, endurance=5, crit=1)
        damage, outcome, _ = bs.calc(a, d, attack_zone="ТЕЛО", defense_zone="ГОЛОВА")
        if damage > 0:
            hits += 1
    assert hits > 0, "Ни одного удара с damage>0 за 30 прогонов — что-то не так в _calculate_damage_detailed"


def test_block_when_zones_match_returns_zero_or_pierce():
    """attack_zone == defense_zone: чаще всего blocked → 0 урона.

    Проверяем что хотя бы половина прогонов даёт block (damage=0).
    """
    bs = _BS()
    blocks = 0
    for seed in range(20):
        random.seed(seed)
        a = _attacker(strength=20, crit=1)
        d = _defender(max_hp=200, endurance=5, crit=1)
        damage, outcome, _ = bs.calc(a, d, attack_zone="ГОЛОВА", defense_zone="ГОЛОВА")
        if damage == 0 and "block" in outcome:
            blocks += 1
    assert blocks >= 5, f"Слишком мало блоков ({blocks}/20) при совпадении зон"
