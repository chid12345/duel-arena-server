"""
tests/test_bot_personas.py — буст ботов: персоны по уровню + полная экипировка.

Покрывает:
- persona_weights_for_level: низы лёгкие (новичок), верхи «богатые» (мажор/донатер),
- каждая ступень суммируется в ~1.0,
- pick_gear_for_persona: с 20 уровня бот ВСЕГДА полностью одет (6 слотов, без дыр),
  для ЛЮБОЙ персоны,
- новичок <20 уровня может быть полуголым (постепенная экипировка).
"""
from __future__ import annotations

import random

from repositories.bots.personas import persona_weights_for_level
from repositories.bots.persona_gear import pick_gear_for_persona, SLOTS_FOR_BOT


def _as_dict(weights):
    return {name: w for name, w in weights}


def test_low_levels_stay_easy():
    """До 10 уровня — только новички (новому игроку легко)."""
    assert persona_weights_for_level(5) == (("novice", 1.00),)
    assert persona_weights_for_level(9) == (("novice", 1.00),)


def test_high_levels_are_rich():
    """60+: больше половины ботов — мажор/донатер (эпик/мифик), новичков мало."""
    w = _as_dict(persona_weights_for_level(70))
    assert w.get("major", 0) + w.get("donator", 0) >= 0.55, f"Верхи должны быть «богатыми», получили {w}"
    assert w.get("novice", 1) <= 0.15, f"Новичков на 60+ должно быть мало, получили {w.get('novice')}"


def test_mid_levels_buffed():
    """35–60: «богатых» (мажор+донатер) заметно больше, чем было (раньше 0.20)."""
    w = _as_dict(persona_weights_for_level(45))
    assert w.get("major", 0) + w.get("donator", 0) >= 0.40, f"Середина должна тяжелеть, получили {w}"


def test_weights_sum_to_one():
    """Каждая ступень суммируется в ~1.0 (иначе pick_persona ломается)."""
    for lv in (5, 15, 25, 45, 70, 100):
        total = sum(w for _, w in persona_weights_for_level(lv))
        assert abs(total - 1.0) < 1e-6, f"lv={lv} сумма весов {total} != 1.0"


def test_full_gear_from_level_20_all_personas():
    """С 20 уровня бот ВСЕГДА в полном комплекте — все 6 слотов, без пустых."""
    slots = set(SLOTS_FOR_BOT)
    for lv in (20, 35, 60, 90):
        for persona in ("novice", "farmer", "major", "donator"):
            for seed in range(15):
                items, _ = pick_gear_for_persona(persona, lv, random.Random(seed))
                assert set(items.keys()) == slots, (
                    f"lv={lv} persona={persona} seed={seed}: пустые слоты! "
                    f"одето {sorted(items.keys())}"
                )


def test_low_level_novice_can_be_underdressed():
    """Новичок <20 уровня — экипировка постепенная (хотя бы иногда есть пропуски)."""
    gaps_seen = False
    for seed in range(40):
        items, _ = pick_gear_for_persona("novice", 5, random.Random(seed))
        if len(items) < len(SLOTS_FOR_BOT):
            gaps_seen = True
            break
    assert gaps_seen, "Новичок на 5 уровне должен иногда быть полуголым"
