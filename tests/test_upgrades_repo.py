"""
tests/test_upgrades_repo.py — repository слой апгрейдов (этап 4B).

Покрывает:
- item_upgrades CRUD: get_item_plus, get_all_item_plus, record_upgrade_attempt,
  reset_item_plus
- upgrade_materials CRUD: get_shards, get_all_shards, add_shards, consume_shards
- Атомарность consume_shards (False при недостатке)
- UPSERT (record_upgrade_attempt создаёт строку или инкрементирует)
"""
from __future__ import annotations

import pytest


# ── item_upgrades ─────────────────────────────────────────────────────────────

def test_get_item_plus_default_zero(db):
    """Если записи нет — plus = 0 (не KeyError)."""
    db.get_or_create_player(1001, "u")
    assert db.get_item_plus(1001, "helmet_free1") == 0


def test_record_upgrade_attempt_success(db):
    """Успешная попытка → plus_level + 1, attempts = 1, fails = 0."""
    db.get_or_create_player(1001, "u")
    new_plus = db.record_upgrade_attempt(
        1001, "helmet_free1", gold_cost=300, shards_cost=1, success=True,
    )
    assert new_plus == 1
    assert db.get_item_plus(1001, "helmet_free1") == 1


def test_record_upgrade_attempt_fail_no_plus_change(db):
    """Провал → attempts +1, fails +1, plus_level НЕ меняется."""
    db.get_or_create_player(1002, "u")
    db.record_upgrade_attempt(1002, "helmet_free1", 300, 1, success=True)  # +1
    db.record_upgrade_attempt(1002, "helmet_free1", 500, 2, success=False)  # провал
    assert db.get_item_plus(1002, "helmet_free1") == 1


def test_record_upgrade_attempt_idempotent_upsert(db):
    """5 успешных подряд → plus = 5 (UPSERT работает)."""
    db.get_or_create_player(1003, "u")
    for _ in range(5):
        db.record_upgrade_attempt(1003, "helmet_free1", 300, 1, success=True)
    assert db.get_item_plus(1003, "helmet_free1") == 5


def test_get_all_item_plus_returns_only_upgraded(db):
    """get_all возвращает только предметы с plus > 0."""
    db.get_or_create_player(1004, "u")
    db.record_upgrade_attempt(1004, "helmet_free1", 300, 1, success=True)
    db.record_upgrade_attempt(1004, "shield_free1", 500, 1, success=False)  # plus=0
    all_plus = db.get_all_item_plus(1004)
    assert "helmet_free1" in all_plus
    assert all_plus["helmet_free1"] == 1
    assert "shield_free1" not in all_plus  # plus=0 не возвращается


def test_reset_item_plus_removes_record(db):
    """Сброс — DELETE из item_upgrades."""
    db.get_or_create_player(1005, "u")
    db.record_upgrade_attempt(1005, "helmet_free1", 300, 1, success=True)
    db.reset_item_plus(1005, "helmet_free1")
    assert db.get_item_plus(1005, "helmet_free1") == 0


# ── upgrade_materials ─────────────────────────────────────────────────────────

def test_get_shards_default_zero(db):
    db.get_or_create_player(1010, "u")
    assert db.get_shards(1010, "T1") == 0
    assert db.get_shards(1010, "T4") == 0


def test_add_shards_creates_then_increments(db):
    """add_shards: UPSERT (создаёт или прибавляет)."""
    db.get_or_create_player(1011, "u")
    db.add_shards(1011, "T2", 5)
    assert db.get_shards(1011, "T2") == 5
    db.add_shards(1011, "T2", 3)
    assert db.get_shards(1011, "T2") == 8


def test_add_shards_zero_or_negative_noop(db):
    """add_shards(0) — игнор, не создаёт строку."""
    db.get_or_create_player(1012, "u")
    db.add_shards(1012, "T1", 0)
    db.add_shards(1012, "T1", -5)
    assert db.get_shards(1012, "T1") == 0


def test_consume_shards_atomic_success(db):
    """Списание при достаточном количестве."""
    db.get_or_create_player(1013, "u")
    db.add_shards(1013, "T3", 10)
    ok = db.consume_shards(1013, "T3", 3)
    assert ok is True
    assert db.get_shards(1013, "T3") == 7


def test_consume_shards_atomic_fail_no_change(db):
    """Недостаточно шардов — False, количество не меняется."""
    db.get_or_create_player(1014, "u")
    db.add_shards(1014, "T1", 2)
    ok = db.consume_shards(1014, "T1", 5)
    assert ok is False
    assert db.get_shards(1014, "T1") == 2


def test_get_all_shards_returns_only_positive(db):
    """get_all_shards: только tier с qty > 0."""
    db.get_or_create_player(1015, "u")
    db.add_shards(1015, "T1", 3)
    db.add_shards(1015, "T2", 5)
    db.add_shards(1015, "T3", 1)
    db.consume_shards(1015, "T3", 1)  # qty=0
    all_sh = db.get_all_shards(1015)
    assert all_sh == {"T1": 3, "T2": 5}
    assert "T3" not in all_sh


def test_invalid_tier_raises(db):
    """Защита от мусорных tier-строк."""
    db.get_or_create_player(1016, "u")
    with pytest.raises(ValueError):
        db.get_shards(1016, "T9")
    with pytest.raises(ValueError):
        db.add_shards(1016, "garbage", 5)
