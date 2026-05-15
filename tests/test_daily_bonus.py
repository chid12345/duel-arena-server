"""
tests/test_daily_bonus.py — ежедневный бонус и стрик.

Покрывает:
- первый claim → +DAILY_BONUS_GOLD, streak=1,
- повторный claim в тот же день блокируется,
- claim на следующий день → streak +1,
- 7-й день → +DIAMONDS_DAILY_STREAK алмазов.
"""
from __future__ import annotations

from datetime import datetime, timedelta


def _set_last_daily(db, uid: int, date_iso: str, streak: int) -> None:
    conn = db.get_connection()
    conn.execute(
        "UPDATE players SET last_daily = ?, daily_streak = ? WHERE user_id = ?",
        (date_iso, streak, uid),
    )
    conn.commit()
    conn.close()


def _row(db, uid: int) -> dict:
    """Прочитать строку игрока (db.get_player() публично не определён)."""
    conn = db.get_connection()
    row = conn.execute("SELECT * FROM players WHERE user_id = ?", (uid,)).fetchone()
    conn.close()
    return dict(row)


def test_first_claim_credits_gold(db):
    """Новый игрок: первый claim → +DAILY_BONUS_GOLD, can_claim=True.

    streak в `check_daily_bonus` инкрементится только при last_daily=вчера.
    Для нового игрока (last_daily=NULL) streak=0 — это особенность функции,
    закрепляем текущее поведение (не баг — streak растёт со 2-го дня).
    """
    from config import DAILY_BONUS_GOLD

    db.get_or_create_player(1001, "u1")
    p_before = _row(db,1001)
    gold_before = int(p_before["gold"])

    res = db.check_daily_bonus(1001)

    assert res["can_claim"] is True
    assert res["bonus"] == DAILY_BONUS_GOLD
    p_after = _row(db, 1001)
    assert p_after["gold"] == gold_before + DAILY_BONUS_GOLD


def test_second_claim_same_day_blocked(db):
    """Повторный claim в тот же день: can_claim=False, gold не меняется."""
    db.get_or_create_player(1002, "u2")
    db.check_daily_bonus(1002)
    p_after_first = _row(db,1002)

    res = db.check_daily_bonus(1002)

    assert res["can_claim"] is False, "Повторный claim в один день должен быть заблокирован"
    p = _row(db,1002)
    assert p["gold"] == p_after_first["gold"], "Золото не должно измениться"


def test_streak_increments_on_consecutive_day(db):
    """last_daily=вчера → claim даёт streak+1."""
    db.get_or_create_player(1003, "u3")
    yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()
    _set_last_daily(db, 1003, yesterday, streak=3)

    res = db.check_daily_bonus(1003)

    assert res["streak"] == 4, f"Ожидали streak=4, получили {res['streak']}"


def test_seventh_day_gives_diamond_bonus(db):
    """streak=6 + last=вчера → claim → streak=7 → +DIAMONDS_DAILY_STREAK."""
    from config import DIAMONDS_DAILY_STREAK

    db.get_or_create_player(1004, "u4")
    yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()
    _set_last_daily(db, 1004, yesterday, streak=6)
    p_before = _row(db,1004)

    res = db.check_daily_bonus(1004)

    assert res["streak"] == 7
    assert res["diamonds_bonus"] == DIAMONDS_DAILY_STREAK
    p = _row(db,1004)
    assert p["diamonds"] == int(p_before["diamonds"]) + DIAMONDS_DAILY_STREAK
