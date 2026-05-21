"""
tests/test_battle_armor.py — расчёт брони (входящий урон).

Покрывает:
- броня снижает входящий урон,
- _eq_def_pct из экипировки уменьшает урон ещё сильнее,
- paladin_gold даёт -3% (защитник Стража),
- agile warrior получает +10% (трейдофф за уклон).

Тестируем чистые методы _armor_multiplier и _apply_incoming_damage —
БД не нужна, просто dict-attacker/defender.
"""
from __future__ import annotations


class _BS:
    """Мини-класс, чтобы получить методы брони без полного BattleSystem."""
    def __init__(self):
        from battle_system.mixins.damage_armor import BattleDamageArmorMixin
        # Инстанс миксина-наследника
        self._mixin = type("_M", (BattleDamageArmorMixin,), {})()

    def apply(self, raw: int, defender: dict) -> int:
        return self._mixin._apply_incoming_damage(raw, defender)


def _defender(level: int = 10, max_hp: int = 200, **extras) -> dict:
    """Базовый защитник с разумными числами."""
    return {
        "level": level, "max_hp": max_hp, "current_hp": max_hp,
        "strength": 10, "endurance": 10, "crit": 5,
        **extras,
    }


def test_armor_reduces_damage_below_raw():
    """Броня (от endurance) даёт коэффициент < 1.0 → урон меньше raw."""
    bs = _BS()
    raw = 100
    d_normal = _defender(level=10, max_hp=200, endurance=15)

    applied = bs.apply(raw, d_normal)

    assert applied < raw, f"Броня должна снижать урон ({applied} >= {raw})"
    assert applied >= 1, "Минимум 1 урон"


def test_eq_def_pct_reduces_damage_more():
    """С _eq_def_pct=0.20 урон меньше, чем без него."""
    bs = _BS()
    raw = 100
    d_no_eq = _defender(endurance=15)
    d_with_eq = _defender(endurance=15, _eq_def_pct=0.20)

    a = bs.apply(raw, d_no_eq)
    b = bs.apply(raw, d_with_eq)

    assert b < a, f"_eq_def_pct должно дать больше снижения: с={b}, без={a}"


def test_paladin_gold_reduces_damage_extra():
    """current_class=paladin_gold → -3% дополнительно."""
    bs = _BS()
    raw = 100
    d_default = _defender(endurance=15)
    d_paladin = _defender(endurance=15, current_class="paladin_gold")

    a = bs.apply(raw, d_default)
    b = bs.apply(raw, d_paladin)

    assert b < a, f"Страж должен получать меньше урона: paladin={b}, default={a}"


def test_agile_warrior_takes_more_damage():
    """warrior_type=agile → -10% брони (получает БОЛЬШЕ урона)."""
    bs = _BS()
    raw = 100
    d_tank = _defender(endurance=15, warrior_type="default")
    d_agile = _defender(endurance=15, warrior_type="agile")

    a = bs.apply(raw, d_tank)
    b = bs.apply(raw, d_agile)

    assert b > a, f"agile должен получать больше урона: agile={b}, default={a}"


def test_body_def_only_on_torso():
    """Зональная защита тела (броня armor2) срабатывает ТОЛЬКО при ударе в ТУЛОВИЩЕ.
    По голове/ногам броня тела не помогает — это её уникальная ниша."""
    bs = _BS()
    raw = 100
    d = _defender(endurance=15, _eq_body_def_pct=0.15)

    head  = bs._mixin._apply_incoming_damage(raw, d, "ГОЛОВА")
    torso = bs._mixin._apply_incoming_damage(raw, d, "ТУЛОВИЩЕ")
    legs  = bs._mixin._apply_incoming_damage(raw, d, "НОГИ")

    assert torso < head, f"по телу урон должен быть меньше: тело={torso}, голова={head}"
    assert head == legs, "защита тела не должна влиять на удары по голове/ногам"


def test_body_def_no_zone_no_effect():
    """Без указания зоны (afk/совместимость) защита тела не применяется."""
    bs = _BS()
    raw = 100
    d_plain = _defender(endurance=15)
    d_body  = _defender(endurance=15, _eq_body_def_pct=0.15)
    # attack_zone=None → одинаково (защита тела не срабатывает)
    assert bs._mixin._apply_incoming_damage(raw, d_plain) == bs._mixin._apply_incoming_damage(raw, d_body)
