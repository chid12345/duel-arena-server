"""tests/test_endless_daily_reward.py — награда за дневной Натиск (+80🪙 +1💎).

Задание «Победи 3 врага в Натиске» должно реально выдавать +80 золота + 1 алмаз
ровно при 3-й победе за день (раньше показывали бейдж, но не платили).
"""
from __future__ import annotations


def _gd(db, uid):
    conn = db.get_connection()
    r = conn.execute("SELECT gold, diamonds FROM players WHERE user_id=?", (uid,)).fetchone()
    conn.close()
    return int(r["gold"] or 0), int(r["diamonds"] or 0)


def test_endless_daily_reward_paid_once_at_3_wins(db):
    db.get_or_create_player(5001, "natisk")
    g0, d0 = _gd(db, 5001)

    db.endless_quest_on_win(5001, 1)
    db.endless_quest_on_win(5001, 2)
    assert _gd(db, 5001) == (g0, d0), "до 3 побед награды быть не должно"

    db.endless_quest_on_win(5001, 3)
    g3, d3 = _gd(db, 5001)
    assert g3 == g0 + 80, f"на 3-й победе +80 золота (было {g0}, стало {g3})"
    assert d3 == d0 + 1, f"на 3-й победе +1 алмаз (было {d0}, стало {d3})"

    db.endless_quest_on_win(5001, 4)
    assert _gd(db, 5001) == (g3, d3), "повторно награда не выдаётся"
