"""
tests/test_inventory.py — инвентарь предметов (player_inventory).

Покрывает:
- add_to_inventory создаёт строку и поднимает inventory_unseen,
- bump_unseen=False (для starter pack) НЕ поднимает счётчик,
- remove_from_inventory корректно уменьшает количество,
- reset_inventory_unseen обнуляет счётчик.

Замечание: get_or_create_player выдаёт стартовый набор (3 предмета,
bump_unseen=False), поэтому новые тесты учитывают это.
"""
from __future__ import annotations


def _get_unseen(db, user_id: int) -> int:
    conn = db.get_connection()
    row = conn.execute(
        "SELECT inventory_unseen FROM players WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return int(row["inventory_unseen"] or 0)


def _qty(db, user_id: int, item_id: str) -> int:
    inv = db.get_inventory(user_id)
    for r in inv:
        if r["item_id"] == item_id:
            return int(r["quantity"] or 0)
    return 0


def test_add_creates_row_and_bumps_unseen(db):
    """Новый предмет → quantity растёт, inventory_unseen +=quantity."""
    db.get_or_create_player(1001, "u1")
    db.reset_inventory_unseen(1001)  # сброс после starter pack

    db.add_to_inventory(1001, "scroll_test_unique", quantity=2)

    assert db.has_item(1001, "scroll_test_unique") is True
    assert _qty(db, 1001, "scroll_test_unique") == 2
    assert _get_unseen(db, 1001) == 2, "unseen должен подняться на quantity"


def test_add_with_bump_unseen_false_does_not_bump(db):
    """Стартовый набор (bump_unseen=False) НЕ показывает красный бейдж."""
    db.get_or_create_player(1002, "u2")
    db.reset_inventory_unseen(1002)

    db.add_to_inventory(1002, "test_item_silent", quantity=1, bump_unseen=False)

    assert db.has_item(1002, "test_item_silent") is True
    assert _get_unseen(db, 1002) == 0, "Со starter-флагом unseen НЕ растёт"


def test_remove_from_inventory_decrements(db):
    """qty=2 → remove(1) → qty=1; полное удаление при qty<=0."""
    db.get_or_create_player(1003, "u3")
    db.add_to_inventory(1003, "test_potion", quantity=2)

    ok = db.remove_from_inventory(1003, "test_potion", quantity=1)
    assert ok is True
    assert _qty(db, 1003, "test_potion") == 1

    ok2 = db.remove_from_inventory(1003, "test_potion", quantity=1)
    assert ok2 is True
    assert db.has_item(1003, "test_potion") is False, "Предмет должен полностью исчезнуть"


def test_reset_inventory_unseen_zeroes(db):
    """После add счётчик >0, после reset = 0."""
    db.get_or_create_player(1004, "u4")
    db.reset_inventory_unseen(1004)
    db.add_to_inventory(1004, "test_box", quantity=3)
    assert _get_unseen(db, 1004) >= 3

    db.reset_inventory_unseen(1004)

    assert _get_unseen(db, 1004) == 0
