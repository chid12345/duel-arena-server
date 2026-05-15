"""
tests/test_quests_daily.py — ежедневные задания.

Покрывает:
- прогресс трекается после боя (update_daily_quest_progress),
- claim начисляет gold/xp,
- дубль-claim → already,
- премиум +25% НЕ применяется к наградам за квесты (важный инвариант),
- неизвестный task_key → ok=False.
"""
from __future__ import annotations

from datetime import datetime, timedelta


def _row(db, uid: int) -> dict:
    conn = db.get_connection()
    row = conn.execute("SELECT * FROM players WHERE user_id = ?", (uid,)).fetchone()
    conn.close()
    return dict(row)


def _task(tasks: list, key: str) -> dict | None:
    return next((t for t in tasks if t["key"] == key), None)


def test_dq_play1_completed_after_battle(db):
    """После 1 боя задание dq_play1 (battles>=1) is_completed=True."""
    db.get_or_create_player(1001, "u1")

    db.update_daily_quest_progress(1001, won_battle=True, is_bot=False)

    tasks = db.get_daily_tasks_status(1001)
    play1 = _task(tasks, "dq_play1")
    assert play1 is not None
    assert play1["is_completed"] is True, "dq_play1 (battles>=1) должно стать completed"


def test_claim_dq_play1_credits_15g_and_40xp(db):
    """Награда за claim dq_play1 (easy/daily) = 15g + 0d + 40xp."""
    db.get_or_create_player(1002, "u2")
    db.update_daily_quest_progress(1002, won_battle=True, is_bot=False)
    p_before = _row(db, 1002)
    gold_before = int(p_before["gold"])

    res = db.claim_daily_task(1002, "dq_play1")

    assert res["ok"] is True
    assert res["gold"] == 15
    assert res["xp"] == 40
    p_after = _row(db, 1002)
    assert p_after["gold"] == gold_before + 15


def test_claim_dq_play1_twice_blocked(db):
    """Повторный claim того же квеста → already."""
    db.get_or_create_player(1003, "u3")
    db.update_daily_quest_progress(1003, won_battle=True, is_bot=False)
    db.claim_daily_task(1003, "dq_play1")

    res = db.claim_daily_task(1003, "dq_play1")

    assert res["ok"] is False, "Повторный claim должен быть отклонён"


def test_premium_does_not_buff_quest_gold(db):
    """Премиум активен → claim даёт ровно 15g (не 18 = 15*1.25)."""
    db.get_or_create_player(1004, "u4")
    db.activate_premium(1004, days=21)
    db.update_daily_quest_progress(1004, won_battle=True, is_bot=False)
    p_before = _row(db, 1004)
    gold_before = int(p_before["gold"])

    res = db.claim_daily_task(1004, "dq_play1")

    assert res["ok"] is True
    assert res["gold"] == 15, "Премиум +25% НЕ должен применяться к наградам за квесты"
    assert res["premium_bonus"] is False
    p_after = _row(db, 1004)
    assert p_after["gold"] == gold_before + 15, "Должно быть ровно +15, без буста"


def test_claim_unknown_task_key_returns_error(db):
    """Несуществующий task_key → ok=False."""
    db.get_or_create_player(1005, "u5")

    res = db.claim_daily_task(1005, "dq_doesnotexist")

    assert res["ok"] is False
