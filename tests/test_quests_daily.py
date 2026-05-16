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


def test_premium_quests_hidden_for_f2p(db):
    """Этап 7D: F2P-игрок НЕ видит премиум-квесты в списке."""
    db.get_or_create_player(1006, "u6")

    tasks = db.get_daily_tasks_status(1006)
    keys = {t["key"] for t in tasks}

    assert "dq_prem_buy1" not in keys
    assert "dq_prem_bot5" not in keys
    assert "dq_prem_play3" not in keys
    # Обычные квесты — на месте
    assert "dq_play1" in keys


def test_premium_quests_visible_for_premium(db):
    """Этап 7D: премиум видит +3 эксклюзивных квеста с difficulty='premium'."""
    db.get_or_create_player(1007, "u7")
    db.activate_premium(1007, days=7)

    tasks = db.get_daily_tasks_status(1007)
    keys = {t["key"] for t in tasks}

    assert "dq_prem_buy1" in keys
    assert "dq_prem_bot5" in keys
    assert "dq_prem_play3" in keys
    # У всех премиум-квестов: 55g + 1💎 + 100xp
    for k in ("dq_prem_buy1", "dq_prem_bot5", "dq_prem_play3"):
        t = _task(tasks, k)
        assert t["reward_gold"] == 55, f"{k}: ожидали 55g, получили {t['reward_gold']}"
        assert t["reward_diamonds"] == 1, f"{k}: ожидали 1💎, получили {t['reward_diamonds']}"
        assert t["reward_xp"] == 100, f"{k}: ожидали 100xp, получили {t['reward_xp']}"
        assert t["premium_only"] is True


def test_premium_quest_claim_credits_55g_and_1_diamond(db):
    """Премиум выполняет dq_prem_play3 (3 боя) → claim даёт 55g + 1💎 + 100xp."""
    db.get_or_create_player(1008, "u8")
    db.activate_premium(1008, days=7)
    for _ in range(3):
        db.update_daily_quest_progress(1008, won_battle=True, is_bot=False)
    p_before = _row(db, 1008)
    gold_before = int(p_before["gold"])
    dia_before = int(p_before["diamonds"])

    res = db.claim_daily_task(1008, "dq_prem_play3")

    assert res["ok"] is True
    assert res["gold"] == 55
    assert res["diamonds"] == 1
    assert res["xp"] == 100
    p_after = _row(db, 1008)
    assert p_after["gold"] == gold_before + 55
    assert p_after["diamonds"] == dia_before + 1
