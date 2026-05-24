"""
tests/test_upgrades_repo.py — repository слой апгрейдов v2 (без шардов).

Покрывает item_upgrades CRUD: get_item_plus, get_all_item_plus,
get_item_free_used, record_upgrade (+1, накопление трат, счётчик бесплатных).
"""
from __future__ import annotations


def test_get_item_plus_default_zero(db):
    """Если записи нет — plus = 0 (не KeyError)."""
    db.get_or_create_player(1001, "u")
    assert db.get_item_plus(1001, "helmet_free1") == 0


def test_record_upgrade_increments_plus(db):
    """Апгрейд → plus_level + 1."""
    db.get_or_create_player(1001, "u")
    new_plus = db.record_upgrade(1001, "helmet_free1", gold_spent=81)
    assert new_plus == 1
    assert db.get_item_plus(1001, "helmet_free1") == 1


def test_record_upgrade_upsert_accumulates(db):
    """5 апгрейдов подряд → plus = 5 (UPSERT)."""
    db.get_or_create_player(1003, "u")
    for _ in range(5):
        db.record_upgrade(1003, "helmet_free1", gold_spent=10)
    assert db.get_item_plus(1003, "helmet_free1") == 5


def test_get_all_item_plus_returns_only_upgraded(db):
    """get_all возвращает только предметы с plus > 0."""
    db.get_or_create_player(1004, "u")
    db.record_upgrade(1004, "helmet_free1", gold_spent=81)
    all_plus = db.get_all_item_plus(1004)
    assert all_plus == {"helmet_free1": 1}


def test_free_used_default_zero(db):
    db.get_or_create_player(1005, "u")
    assert db.get_item_free_used(1005, "helmet_free1") == 0


def test_record_upgrade_counts_free(db):
    """was_free=True увеличивает free_used; платный — нет."""
    db.get_or_create_player(1006, "u")
    db.record_upgrade(1006, "helmet_free1", gold_spent=100)            # платный
    db.record_upgrade(1006, "helmet_free1", was_free=True)            # бесплатный
    db.record_upgrade(1006, "helmet_free1", diamonds_spent=10)        # платный (алмазы)
    assert db.get_item_plus(1006, "helmet_free1") == 3
    assert db.get_item_free_used(1006, "helmet_free1") == 1
