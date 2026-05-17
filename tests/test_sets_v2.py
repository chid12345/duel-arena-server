"""
tests/test_sets_v2.py — архетипные сеты v2 (Этап 5A).

Покрывает:
- resolve_active_sets: 0/1 предмета — пусто, 2+ — активен с порогом
- Несколько сетов одновременно
- Пороги 2/4/6 (игра имеет 6 слотов, не 7)
- Перк только на 6 (полный комплект)
- aggregate_set_bonuses складывает статы со всех активных сетов
"""
from __future__ import annotations

import pytest

from config.sets_catalog_v2 import SETS_V2, SET_IDS
from repositories.sets import aggregate_set_bonuses, resolve_active_sets


def _eq(set_ids: list[str]) -> dict[str, dict]:
    """Утилита: словарь equipped из списка set_id (один предмет = один слот)."""
    return {f"slot{i}": {"item_id": f"it{i}", "set_id": sid} for i, sid in enumerate(set_ids)}


# ── resolve_active_sets ───────────────────────────────────────────────────────

def test_no_items_returns_empty():
    assert resolve_active_sets({}) == []


def test_one_predator_no_threshold():
    """1 предмет — порог 2 не достигнут, сет неактивен."""
    assert resolve_active_sets(_eq(["predator"])) == []


def test_two_predator_activates_threshold_2():
    """2 предмета → порог 2, бонус crit_bonus=4."""
    res = resolve_active_sets(_eq(["predator"] * 2))
    assert len(res) == 1
    assert res[0]["set_id"] == "predator"
    assert res[0]["count"] == 2
    assert res[0]["threshold"] == 2
    assert res[0]["bonuses"]["crit_bonus"] == 4


def test_four_predator_activates_threshold_4():
    """4 предмета → порог 4, бонусы сильнее."""
    res = resolve_active_sets(_eq(["predator"] * 4))
    assert len(res) == 1
    assert res[0]["threshold"] == 4
    assert res[0]["bonuses"]["atk_pct"] == 3


def test_six_predator_activates_threshold_6_with_perk():
    """6 предметов = полный комплект → порог 6, есть perk_id."""
    res = resolve_active_sets(_eq(["predator"] * 6))
    assert len(res) == 1
    assert res[0]["threshold"] == 6
    assert res[0]["bonuses"].get("perk_id") == "frenzy_on_crit"


def test_five_predator_still_threshold_4():
    """5 предметов — это «4 пройдено, 6 не достигнуто», порог 4."""
    res = resolve_active_sets(_eq(["predator"] * 5))
    assert res[0]["threshold"] == 4
    assert "perk_id" not in res[0]["bonuses"]


def test_three_sets_simultaneously():
    """2 хищника + 2 бастиона + 2 берсерка = 3 активных лёгких сета."""
    res = resolve_active_sets(_eq(["predator"] * 2 + ["bastion"] * 2 + ["berserk"] * 2))
    ids = {s["set_id"] for s in res}
    assert ids == {"predator", "bastion", "berserk"}
    for s in res:
        assert s["threshold"] == 2


def test_unknown_set_id_ignored():
    """Мусорный set_id игнорируется (не падает)."""
    res = resolve_active_sets(_eq(["nonexistent_set"] * 4))
    assert res == []


def test_items_without_set_id_ignored():
    """Предмет без set_id (legacy) не считается."""
    eq = {"slot1": {"item_id": "old_sword"}}  # нет set_id
    assert resolve_active_sets(eq) == []


def test_all_six_archetypes_defined():
    """Каталог содержит все 6 архетипов с порогами 2/4/6 и перком на 6."""
    assert len(SETS_V2) == 6
    expected = {"predator", "bastion", "berserk", "ghost", "mage", "regent"}
    assert set(SET_IDS) == expected
    for sid, meta in SETS_V2.items():
        assert set(meta["thresholds"].keys()) == {2, 4, 6}, f"{sid}: пороги"
        assert "perk_id" in meta["thresholds"][6], f"{sid}: на 6 нет перка"


# ── aggregate_set_bonuses ─────────────────────────────────────────────────────

def test_aggregate_empty():
    """Пустой список активных сетов → нулевые суммы."""
    res = aggregate_set_bonuses([])
    assert res["hp_pct"] == 0.0
    assert res["atk_pct"] == 0.0
    assert res["perks"] == []


def test_aggregate_single_set():
    """Один сет — статы как у этого сета."""
    sets = [{
        "set_id": "predator", "threshold": 2, "count": 2,
        "bonuses": {"crit_bonus": 4},
    }]
    res = aggregate_set_bonuses(sets)
    assert res["crit_bonus"] == 4


def test_aggregate_multiple_sets_stacks():
    """Хищник 2 + Бастион 2 = крит + HP одновременно."""
    sets = [
        {"set_id": "predator", "threshold": 2, "count": 2, "bonuses": {"crit_bonus": 4}},
        {"set_id": "bastion",  "threshold": 2, "count": 2, "bonuses": {"hp_pct": 3}},
    ]
    res = aggregate_set_bonuses(sets)
    assert res["crit_bonus"] == 4
    assert res["hp_pct"] == 3.0


# ── current_class (armor) ─────────────────────────────────────────────────────
# После Унификации armor (этап 7 в main) armor приходит как обычный слот
# в equipped с set_id. Параметр current_class в resolve_active_sets — для
# обратной совместимости, но игнорируется (noqa: ARG001).

def test_armor_class_counts_in_set():
    """Унификация armor (шаг 4/6): armor — обычный слот в equipped, не через current_class.

    Раньше armor добавлялся виртуально через current_class. Теперь —
    обычный slot в equipped[armor] с set_id. Параметр current_class
    сохранён в сигнатуре для обратной совместимости, но игнорируется.

    1 weapon predator + 1 armor predator → count=2, порог 2.
    """
    eq = {
        "weapon": {"item_id": "w1", "set_id": "predator"},
        "armor":  {"item_id": "armor_free1", "set_id": "predator"},
    }
    res = resolve_active_sets(eq, current_class=None)
    assert len(res) == 1
    assert res[0]["set_id"] == "predator"
    assert res[0]["count"] == 2
    assert res[0]["threshold"] == 2


def test_armor_class_completes_full_set():
    """5 predator-equipment + armor-predator = полный комплект 6 → перк."""
    eq = _eq(["predator"] * 5)
    eq["armor"] = {"item_id": "armor_free1", "set_id": "predator"}
    res = resolve_active_sets(eq, current_class=None)
    assert res[0]["count"] == 6
    assert res[0]["threshold"] == 6
    assert "perk_id" in res[0]["bonuses"]


def test_armor_class_unknown_ignored():
    """current_class теперь игнорируется. Если armor нет в equipped — не добавляется."""
    eq = _eq(["predator"] * 3)
    res = resolve_active_sets(eq, current_class="default_start")
    # 3 predator-предмета, armor НЕ в equipped → count=3
    assert res[0]["count"] == 3


def test_armor_class_none_no_effect():
    """current_class=None → как будто не передано."""
    eq = _eq(["bastion"] * 3)
    res = resolve_active_sets(eq, current_class=None)
    assert res[0]["count"] == 3


def test_aggregate_collects_perks():
    """Из бонусов порога 6 — perk_id в списке perks."""
    sets = [{
        "set_id": "predator", "threshold": 6, "count": 6,
        "bonuses": {"crit_bonus": 18, "atk_pct": 8, "perk_id": "frenzy_on_crit"},
    }]
    res = aggregate_set_bonuses(sets)
    assert "frenzy_on_crit" in res["perks"]
    assert res["crit_bonus"] == 18
