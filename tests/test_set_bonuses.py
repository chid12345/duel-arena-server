"""
tests/test_set_bonuses.py — совместимый shim над v2 архетипными сетами (Этап 5C).

Покрывает старое API config/set_bonuses.py:
- resolve_active_set возвращает «главный» сет (max threshold)
- get_wb_set_data — агрегированная сводка для WB
- count_set_rarities — legacy, считает по рарити (для UI)
- bonuses_human — текстовое представление бонусов
- ring2 не считается в новом resolver

Старые тесты на рарити-сеты заменены — система переведена на архетипы.
"""
from __future__ import annotations


def _eq_archetype(set_ids: list[str], slot_prefix: str = "slot") -> dict:
    """Equipped из списка set_id с виртуальными слотами."""
    return {f"{slot_prefix}{i}": {"item_id": f"x{i}", "set_id": sid}
            for i, sid in enumerate(set_ids)}


def test_resolve_active_set_returns_main_set():
    """resolve_active_set возвращает главный (с max threshold) при нескольких."""
    from config.set_bonuses import resolve_active_set

    # 6 хищников (полный комплект) + 3 бастиона (порог 2)
    eq = _eq_archetype(["predator"] * 6 + ["bastion"] * 3)
    info = resolve_active_set(eq, current_class=None)
    assert info is not None
    assert info["rarity"] == "predator"  # set_id под legacy-именем поля
    assert info["threshold"] == 6
    assert info["perk"] == "frenzy_on_crit"


def test_resolve_below_threshold_returns_none():
    """1 предмет → порог 2 не достигнут → None."""
    from config.set_bonuses import resolve_active_set
    eq = _eq_archetype(["predator"])
    assert resolve_active_set(eq) is None


def test_resolve_armor_slot_counts_as_normal_equipment():
    """После унификации armor (шаг 4/6) armor — обычный слот в equipped.

    Раньше armor приходил виртуально через current_class; теперь
    equipped[armor] содержит реальный item с set_id, и resolver его
    считает как обычно. Параметр current_class игнорируется.
    """
    from config.set_bonuses import resolve_active_set
    # 1 weapon-predator + 1 armor-predator = 2 → порог 2
    eq = {
        "weapon": {"item_id": "w1", "set_id": "predator"},
        "armor":  {"item_id": "armor_free1", "set_id": "predator"},
    }
    info = resolve_active_set(eq, current_class=None)
    assert info is not None
    assert info["count"] == 2
    assert info["threshold"] == 2


def test_resolve_current_class_param_ignored():
    """Параметр current_class теперь игнорируется — armor приходит в equipped."""
    from config.set_bonuses import resolve_active_set
    eq = _eq_archetype(["predator"])  # 1 предмет, armor не в equipped
    # Раньше current_class давал +1 виртуально → порог 2. Теперь нет.
    info = resolve_active_set(eq, current_class="base_crit")
    assert info is None, "Без armor в equipped — только 1 предмет, порог 2 не достигнут"


def test_get_wb_set_data_aggregates_multiple_sets():
    """2 хищника + 2 бастиона → hp_pct и crit_bonus оба активны."""
    from config.set_bonuses import get_wb_set_data
    eq = _eq_archetype(["predator"] * 2 + ["bastion"] * 2)
    data = get_wb_set_data(eq, current_class=None)
    assert data["hp_pct"] == 3        # bastion threshold 2 → hp_pct=3
    assert data["perk_id"] is None    # порог 2, не 6
    assert data["count"] == 4         # сумма по двум сетам


def test_get_wb_set_data_full_set_has_perk():
    """6 бастиона → перк second_wind."""
    from config.set_bonuses import get_wb_set_data
    eq = _eq_archetype(["bastion"] * 6)
    data = get_wb_set_data(eq, current_class=None)
    assert data["perk_id"] == "second_wind"
    assert data["hp_pct"] == 15  # 6-комплект bastion


def test_get_wb_set_data_empty_eq():
    """Без сетов → нули и None."""
    from config.set_bonuses import get_wb_set_data
    data = get_wb_set_data({}, current_class=None)
    assert data == {"hp_pct": 0, "atk_pct": 0, "def_pct": 0.0,
                    "perk_id": None, "count": 0, "rarity": None}


def test_count_set_rarities_legacy_still_works():
    """count_set_rarities считает по рарити (для legacy UI).

    Старый armor снесён под корень — слот не считается в SET_CATEGORIES.
    """
    from config.set_bonuses import count_set_rarities

    equipped = {
        "weapon": {"rarity": "rare", "item_id": "x1"},
        "shield": {"rarity": "rare", "item_id": "x2"},
        "belt":   {"rarity": "common", "item_id": "x3"},
        "boots":  {"rarity": "common", "item_id": "x4"},
        "ring1":  {"rarity": "rare", "item_id": "x5"},
    }
    counts = count_set_rarities(equipped)
    assert counts.get("rare") == 3
    assert counts.get("common") == 2

    # current_class игнорируется — результат тот же
    counts2 = count_set_rarities(equipped, current_class="berserker_gold")
    assert counts2 == counts


def test_ring2_not_counted_in_new_resolver():
    """ring2 — legacy слот, новый resolver исключает его."""
    from repositories.sets import resolve_active_sets
    # 5 predator + 1 в ring2 → ring2 не должен считаться
    eq = {
        "weapon": {"item_id": "w", "set_id": "predator"},
        "shield": {"item_id": "s", "set_id": "predator"},
        "belt":   {"item_id": "b", "set_id": "predator"},
        "boots":  {"item_id": "bt", "set_id": "predator"},
        "ring1":  {"item_id": "r1", "set_id": "predator"},
        "ring2":  {"item_id": "r2", "set_id": "predator"},  # ← не должен считаться
    }
    res = resolve_active_sets(eq)
    assert len(res) == 1
    assert res[0]["count"] == 5  # не 6


def test_bonuses_human_renders_both_formats():
    """bonuses_human поддерживает старые и новые ключи."""
    from config.set_bonuses import bonuses_human
    # Новые архетипные бонусы
    lines = bonuses_human({"crit_bonus": 6, "atk_pct": 5, "def_pct": 0.10})
    assert "+5% урон" in lines
    assert "+6 крит" in lines
    assert "+10% защита от урона" in lines
    # Legacy ключ def_pct_bonus тоже должен работать
    lines2 = bonuses_human({"def_pct_bonus": 0.03, "hp_pct": 5})
    assert "+5% HP" in lines2
    assert "+3% защита от урона" in lines2
