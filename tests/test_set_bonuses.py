"""
tests/test_set_bonuses.py — бонусы за полный комплект (set bonus).

Покрывает:
- 6 предметов одной редкости → bonus = SET_BONUSES[rarity][6],
- меньше 3 в любой редкости → None,
- при равенстве побеждает старшая редкость,
- ring2 НЕ считается в сете (он не в SET_CATEGORIES, фантом-слот).

Чистые функции — БД не нужна.
"""
from __future__ import annotations


def _piece(rarity: str) -> dict:
    """Минимальная заглушка предмета: только поле rarity нужно для count_set_rarities."""
    return {"rarity": rarity, "item_id": f"x_{rarity}"}


def test_six_pieces_common_gives_max_common_bonus():
    """6 common (включая armor через current_class) → bonus = SET_BONUSES[common][6]."""
    from config.set_bonuses import resolve_active_set, SET_BONUSES

    equipped = {
        "weapon": _piece("common"),
        "shield": _piece("common"),
        "belt":   _piece("common"),
        "boots":  _piece("common"),
        "ring1":  _piece("common"),
        # armor читается из current_class
    }
    info = resolve_active_set(equipped, current_class="tank_free")  # _free → common

    assert info is not None, "При 6/6 сет должен быть активен"
    assert info["rarity"] == "common"
    assert info["count"] == 6
    assert info["threshold"] == 6
    assert info["bonuses"] == SET_BONUSES["common"][6]
    assert info["perk"] == "second_wind"


def test_below_threshold_returns_none():
    """Меньше 3 предметов одной редкости → сет не активен (None)."""
    from config.set_bonuses import resolve_active_set

    equipped = {
        "weapon": _piece("common"),
        "shield": _piece("rare"),
    }
    info = resolve_active_set(equipped, current_class=None)

    assert info is None, "При 2/6 сет не должен быть активен"


def test_tie_resolves_to_higher_rarity():
    """3 common + 3 rare (равенство) → побеждает rare (старшая редкость)."""
    from config.set_bonuses import resolve_active_set

    equipped = {
        "weapon": _piece("common"),
        "shield": _piece("common"),
        "belt":   _piece("common"),
        "boots":  _piece("rare"),
        "ring1":  _piece("rare"),
        # armor читается из current_class — даём rare
    }
    info = resolve_active_set(equipped, current_class="berserker_gold")  # _gold → rare

    assert info is not None
    assert info["rarity"] == "rare", f"При равенстве 3-3 должна победить rare, получили {info['rarity']}"
    assert info["threshold"] == 3


def test_ring2_not_counted_in_set():
    """ring2 не входит в SET_CATEGORIES — даже надетое там кольцо не помогает добить сет."""
    from config.set_bonuses import resolve_active_set, count_set_rarities

    equipped = {
        "weapon": _piece("epic"),
        "shield": _piece("epic"),
        "belt":   _piece("epic"),
        "boots":  _piece("epic"),
        "ring1":  _piece("epic"),
        "ring2":  _piece("epic"),  # ← фантом, не считаем
        # armor через current_class
    }
    counts = count_set_rarities(equipped, current_class="dragonknight_diamonds")  # epic

    # 5 слотов из equipped (без ring2) + armor = 6 epic
    assert counts.get("epic") == 6, f"Должно быть 6 (без учёта ring2), получили {counts.get('epic')}"

    info = resolve_active_set(equipped, current_class="dragonknight_diamonds")
    assert info is not None
    assert info["count"] == 6, "Если бы ring2 считалось — count был бы 7, но он не в SET_CATEGORIES"
