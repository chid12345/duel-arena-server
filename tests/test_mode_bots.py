"""
tests/test_mode_bots.py — Натиск и Титаны: соперники теперь «одеты».

После правки «боты слабые/неровные по режимам» волновые боты Натиска и боссы
Башни строятся на той же модели силы, что обычные PvE-боты (db._compute_bot_stats
+ equip_bot), поэтому у них есть броня (защита тела), бонусы вещей и сет-перк —
а не голый стат-блок. Сложность растёт с волной/этажом.
"""
from __future__ import annotations

from api.tma_bots import _endless_bot_for_wave, _titan_boss_for_floor

_PLAYER = {"level": 70, "max_hp": 1300, "strength": 90, "endurance": 90, "crit": 40}


# ── Натиск ────────────────────────────────────────────────────────────────────

def test_endless_bot_is_dressed():
    """Глубокая волна → бот полностью одет, есть защита тела от брони."""
    bot = _endless_bot_for_wave(55)
    assert bot.get("equipment_items"), "волновой бот должен иметь вещи"
    assert float(bot.get("_eq_body_def_pct", 0)) > 0, "должна быть защита тела (броня)"


def test_endless_difficulty_grows_with_wave():
    """Сложность растёт: глубокая волна сильнее ранней по уровню и HP."""
    low = _endless_bot_for_wave(3)
    high = _endless_bot_for_wave(60)
    assert high["level"] > low["level"]
    assert high["max_hp"] > low["max_hp"]


def test_endless_deep_waves_can_have_set_perk():
    """На глубоких волнах (богатые персоны, ур.45+) встречается сет-перк."""
    seen = any(_endless_bot_for_wave(w).get("_set_perk_id") for w in range(48, 70))
    assert seen, "глубокие волны должны иногда давать сет-перк 6/6"


# ── Титаны (Башня) ──────────────────────────────────────────────────────────

def test_titan_boss_is_dressed():
    """Босс этажа одет и имеет защиту тела от брони."""
    boss = _titan_boss_for_floor(10, _PLAYER)
    assert boss.get("equipment_items"), "босс должен иметь вещи"
    assert float(boss.get("_eq_body_def_pct", 0)) > 0


def test_titan_floor_scales_up():
    """Глубокий этаж сильнее первого (уровень и HP-танк выше)."""
    f1 = _titan_boss_for_floor(1, _PLAYER)
    f20 = _titan_boss_for_floor(20, _PLAYER)
    assert f20["level"] > f1["level"]
    assert f20["max_hp"] > f1["max_hp"]


def test_titan_deep_floor_has_set_perk():
    """С 20-го этажа босс — донатер в полном сете → гарантированный перк."""
    boss = _titan_boss_for_floor(22, _PLAYER)
    assert boss.get("_set_perk_id"), "глубокий этаж должен давать сет-перк"


def test_titan_boss_hp_is_killable_range():
    """HP босса — «жирный», но в разумных пределах (не стена за лимит раундов)."""
    boss = _titan_boss_for_floor(10, _PLAYER)
    # не должен быть абсурдным (старый баг: 5850 HP на низком этаже)
    assert boss["max_hp"] < 4000, f"HP босса 10 этажа слишком большой: {boss['max_hp']}"
