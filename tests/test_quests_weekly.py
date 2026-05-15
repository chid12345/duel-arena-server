"""
tests/test_quests_weekly.py — недельные дополнительные задания.

Главный инвариант (фикс коммита 337afd0):
    weekly_undefeated_5 читает task_progress[wq_max_streak_<week>],
    а НЕ players.win_streak (был баг — серия с прошлой недели засчитывалась).
"""
from __future__ import annotations

from datetime import datetime


def _week_key() -> str:
    y, w, _ = datetime.utcnow().isocalendar()
    return f"{int(y)}-W{int(w):02d}"


def _row(db, uid: int) -> dict:
    conn = db.get_connection()
    row = conn.execute("SELECT * FROM players WHERE user_id = ?", (uid,)).fetchone()
    conn.close()
    return dict(row)


def _task(tasks: list, key: str):
    return next((t for t in tasks if t["key"] == key), None)


def test_undefeated_5_reads_weekly_streak_not_global(db):
    """Прямой UPDATE players.win_streak=10 без обновления task_progress
    → задание НЕ выполнено (раньше был баг — засчитывалось)."""
    db.get_or_create_player(1001, "u1")
    conn = db.get_connection()
    conn.execute("UPDATE players SET win_streak = 10 WHERE user_id = ?", (1001,))
    conn.commit()
    conn.close()

    tasks = db.get_weekly_extra_status(1001, _week_key())
    t = _task(tasks, "weekly_undefeated_5")

    assert t is not None
    assert t["is_completed"] is False, (
        "Глобальный win_streak НЕ должен засчитываться в недельный квест"
    )


def test_undefeated_5_completed_when_weekly_streak_set(db):
    """set_task_progress_if_greater(wq_max_streak_<week>, 5) → выполнено."""
    db.get_or_create_player(1002, "u2")
    wk = _week_key()

    db.set_task_progress_if_greater(1002, f"wq_max_streak_{wk}", 5)

    tasks = db.get_weekly_extra_status(1002, wk)
    t = _task(tasks, "weekly_undefeated_5")
    assert t["is_completed"] is True


def test_claim_weekly_undefeated_5_gives_medium_reward(db):
    """weekly/medium = 100g + 1d + 280xp."""
    db.get_or_create_player(1003, "u3")
    wk = _week_key()
    db.set_task_progress_if_greater(1003, f"wq_max_streak_{wk}", 5)
    p_before = _row(db, 1003)

    res = db.claim_weekly_extra(1003, "weekly_undefeated_5", wk)

    assert res["ok"] is True
    assert res["gold"] == 100
    assert res["diamonds"] == 1
    assert res["xp"] == 280
    p = _row(db, 1003)
    assert p["gold"] == int(p_before["gold"]) + 100
    assert p["diamonds"] == int(p_before["diamonds"]) + 1


def test_claim_weekly_twice_blocked(db):
    """Повторный claim того же weekly-квеста → already."""
    db.get_or_create_player(1004, "u4")
    wk = _week_key()
    db.set_task_progress_if_greater(1004, f"wq_max_streak_{wk}", 5)
    db.claim_weekly_extra(1004, "weekly_undefeated_5", wk)

    res = db.claim_weekly_extra(1004, "weekly_undefeated_5", wk)

    assert res["ok"] is False


def test_track_purchase_updates_weekly_buy_and_spend(db):
    """track_purchase(currency=gold, price=200) обновляет wq_buy_gold и wq_spend_gold."""
    db.get_or_create_player(1005, "u5")
    wk = _week_key()

    db.track_purchase(1005, "potion_test", "gold", 200)
    db.track_purchase(1005, "potion_test", "gold", 300)

    buy_count = db.get_task_progress(1005, f"wq_buy_gold_{wk}")
    spend_total = db.get_task_progress(1005, f"wq_spend_gold_{wk}")
    assert buy_count == 2, f"Ожидали 2 покупки, получили {buy_count}"
    assert spend_total == 500, f"Ожидали 500 золота потрачено, получили {spend_total}"
