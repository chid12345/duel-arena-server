"""
tests/test_payments_stars.py — Telegram Stars (anti-exploit + дедуп TMA).

Главный инвариант: TMA-confirm БЕЗ bot-записи → not_verified
(закрывает эксплойт фарма алмазов).
"""
from __future__ import annotations


def _count_stars_rows(db, uid: int, package: str, source: str) -> int:
    conn = db.get_connection()
    n = conn.execute(
        "SELECT COUNT(*) AS n FROM stars_payments WHERE user_id=? AND package_id=? AND source=?",
        (uid, package, source),
    ).fetchone()["n"]
    conn.close()
    return int(n)


def test_record_bot_payment_dedup_within_15min(db):
    """Повторный record в окне 15 мин не создаёт дубль."""
    db.get_or_create_player(1001, "u1")

    db.record_stars_bot_payment(1001, "premium_21", stars=399)
    db.record_stars_bot_payment(1001, "premium_21", stars=399)

    assert _count_stars_rows(db, 1001, "premium_21", "bot") == 1


def test_check_stars_bot_payment_returns_true_after_record(db):
    """check видит запись после record."""
    db.get_or_create_player(1002, "u2")
    assert db.check_stars_bot_payment(1002, "premium_21") is False, "До записи — False"

    db.record_stars_bot_payment(1002, "premium_21", stars=399)

    assert db.check_stars_bot_payment(1002, "premium_21") is True


def test_confirm_without_bot_returns_not_verified(db):
    """Anti-exploit: TMA-confirm без bot-записи → not_verified, алмазы НЕ зачисляются."""
    db.get_or_create_player(1003, "u3")
    conn = db.get_connection()
    diamonds_before = conn.execute("SELECT diamonds FROM players WHERE user_id=?", (1003,)).fetchone()["diamonds"]
    conn.close()

    res = db.confirm_stars_payment(1003, "premium_21", diamonds=100, stars=399)

    assert res["ok"] is False
    assert res["reason"] == "not_verified", "Без bot-записи confirm должен вернуть not_verified"
    conn = db.get_connection()
    diamonds_after = conn.execute("SELECT diamonds FROM players WHERE user_id=?", (1003,)).fetchone()["diamonds"]
    conn.close()
    assert diamonds_after == diamonds_before, "Алмазы НЕ должны быть зачислены"


def test_confirm_after_bot_credits_diamonds(db):
    """bot-запись есть → confirm зачисляет diamonds + INSERT в tma."""
    db.get_or_create_player(1004, "u4")
    db.record_stars_bot_payment(1004, "stars_pack_100", stars=399)

    res = db.confirm_stars_payment(1004, "stars_pack_100", diamonds=100, stars=399)

    assert res["ok"] is True
    assert res["diamonds"] == 100
    conn = db.get_connection()
    p = conn.execute("SELECT diamonds FROM players WHERE user_id=?", (1004,)).fetchone()
    conn.close()
    assert p["diamonds"] == 100
    assert _count_stars_rows(db, 1004, "stars_pack_100", "tma") == 1


def test_confirm_twice_returns_already_credited(db):
    """Повторный confirm в окне 15 мин → already_credited, без double-credit."""
    db.get_or_create_player(1005, "u5")
    db.record_stars_bot_payment(1005, "stars_pack_100", stars=399)
    db.confirm_stars_payment(1005, "stars_pack_100", diamonds=100, stars=399)

    res2 = db.confirm_stars_payment(1005, "stars_pack_100", diamonds=100, stars=399)

    assert res2["ok"] is False
    assert res2["reason"] == "already_credited"
    conn = db.get_connection()
    p = conn.execute("SELECT diamonds FROM players WHERE user_id=?", (1005,)).fetchone()
    conn.close()
    assert p["diamonds"] == 100, "Алмазы НЕ должны быть зачислены второй раз"


def test_mark_stars_tma_delivered_dedup(db):
    """Повторный mark в окне 15 мин → False."""
    db.get_or_create_player(1006, "u6")

    first = db.mark_stars_tma_delivered(1006, "scroll_test", stars=130)
    second = db.mark_stars_tma_delivered(1006, "scroll_test", stars=130)

    assert first is True
    assert second is False, "Повторная пометка в том же окне → False"
