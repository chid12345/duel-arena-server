"""
tests/test_quests_streak_login.py — 7-дневный стрик входа.

Покрывает:
- первый login → streak_day=1, week_set=0,
- тот же день → advanced=False,
- пропуск дня → сброс streak до 1,
- claim 1-го дня даёт награду по набору,
- claim 7-го дня — cycle_complete + ротация week_set,
- claim не «своего» дня → ok=False.
"""
from __future__ import annotations

import json
from datetime import date, timedelta


def _set_streak_state(db, uid: int, streak_day: int, last_login: str, claimed: list, week_set: int = 0):
    conn = db.get_connection()
    conn.execute(
        "UPDATE login_streak_v2 SET streak_day=?, week_set=?, last_login_date=?, days_claimed_json=? "
        "WHERE user_id=?",
        (streak_day, week_set, last_login, json.dumps(claimed), uid),
    )
    conn.commit()
    conn.close()


def test_first_login_starts_streak_day_1(db):
    """Новый игрок: process_login_streak → streak_day=1, week_set=0, advanced=True."""
    db.get_or_create_player(1001, "u1")

    res = db.process_login_streak(1001)

    assert res["streak_day"] == 1
    assert res["week_set"] == 0
    assert res["advanced"] is True


def test_same_day_login_does_not_advance(db):
    """Повторный заход в тот же день → advanced=False, streak не растёт."""
    db.get_or_create_player(1002, "u2")
    db.process_login_streak(1002)

    res = db.process_login_streak(1002)

    assert res["advanced"] is False
    assert res["streak_day"] == 1


def test_skipped_day_resets_streak(db):
    """last_login=3 дня назад → процесс ставит streak=1 (сброс)."""
    db.get_or_create_player(1003, "u3")
    db.process_login_streak(1003)
    three_days_ago = (date.today() - timedelta(days=3)).isoformat()
    _set_streak_state(db, 1003, streak_day=4, last_login=three_days_ago, claimed=[1, 2, 3])

    res = db.process_login_streak(1003)

    assert res["streak_day"] == 1, "Пропуск дня должен сбросить стрик до 1"


def test_claim_day_1_credits_set_a_rewards(db):
    """День 1 набора A: 100g + 0d + 200xp, без предмета."""
    db.get_or_create_player(1004, "u4")
    db.process_login_streak(1004)  # streak_day=1, week_set=0

    res = db.claim_streak_day(1004, 1)

    assert res["ok"] is True
    assert res["gold"] == 100
    assert res["xp"] == 200
    assert res["diamonds"] == 0
    assert res["item"] is None
    assert res["cycle_complete"] is False


def test_claim_day_7_completes_cycle_and_rotates_week_set(db):
    """День 7 набора A: cycle_complete=True, week_set: 0 → 1, streak_day сбросится."""
    db.get_or_create_player(1005, "u5")
    db.process_login_streak(1005)
    # Готовим состояние: уже у дня 7, дни 1-6 заклеймлены
    today_iso = date.today().isoformat()
    _set_streak_state(db, 1005, streak_day=7, last_login=today_iso,
                      claimed=[1, 2, 3, 4, 5, 6], week_set=0)

    res = db.claim_streak_day(1005, 7)

    assert res["ok"] is True
    assert res["cycle_complete"] is True
    # Проверим состояние в БД: week_set должен быть 1 (ротация), streak_day=0
    status = db.get_login_streak_status(1005)
    assert status["streak_day"] == 0, "После 7-го дня streak_day сбрасывается"
    assert status["week_set"] == 1, f"week_set должен быть 1, получили {status['week_set']}"


def test_claim_wrong_day_returns_error(db):
    """claim_streak_day(3) при текущем streak_day=2 → ok=False."""
    db.get_or_create_player(1006, "u6")
    db.process_login_streak(1006)
    today_iso = date.today().isoformat()
    _set_streak_state(db, 1006, streak_day=2, last_login=today_iso, claimed=[1])

    res = db.claim_streak_day(1006, 3)

    assert res["ok"] is False
    assert "Текущий" in res["reason"] or "день" in res["reason"].lower()
