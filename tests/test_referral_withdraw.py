"""
tests/test_referral_withdraw.py — ручной вывод реферального USDT.

Покрывает:
- заявка списывает баланс СРАЗУ (атомарный захват — фикс гонки двойного вывода),
- ниже минимума ($5) — отказ,
- повторная заявка после захвата невозможна (баланс уже 0),
- кулдаун 24ч блокирует второй вывод,
- /payout_done закрывает заявку (идемпотентно),
- /payout_reject возвращает деньги и снимает кулдаун.
"""
from __future__ import annotations


def _set_balance(db, uid: int, amount: float):
    conn = db.get_connection()
    conn.execute("UPDATE players SET referral_usdt_balance = ? WHERE user_id = ?", (amount, uid))
    conn.commit()
    conn.close()


def _balance(db, uid: int) -> float:
    conn = db.get_connection()
    row = conn.execute(
        "SELECT COALESCE(referral_usdt_balance, 0) AS b FROM players WHERE user_id = ?", (uid,)
    ).fetchone()
    conn.close()
    return round(float(row["b"]), 4)


def test_request_freezes_balance_immediately(db):
    """Заявка СРАЗУ списывает баланс (деньги заморожены до выплаты)."""
    db.get_or_create_player(3001, "wd")
    _set_balance(db, 3001, 7.50)

    res = db.request_referral_withdrawal(3001, username="wd")

    assert res["ok"] is True
    assert res["pending"] is True
    assert res["amount"] == 7.5
    assert res["withdrawal_id"] >= 1
    assert _balance(db, 3001) == 0.0, "Баланс должен замёрзнуться (списаться) сразу"


def test_request_below_minimum_rejected(db):
    """Меньше $5 — вывод недоступен, баланс не трогаем."""
    db.get_or_create_player(3002, "low")
    _set_balance(db, 3002, 3.0)

    res = db.request_referral_withdrawal(3002)

    assert res["ok"] is False
    assert _balance(db, 3002) == 3.0, "Баланс не должен меняться при отказе"


def test_no_double_withdrawal(db):
    """Вторая заявка подряд невозможна — баланс уже захвачен (фикс гонки)."""
    db.get_or_create_player(3003, "race")
    _set_balance(db, 3003, 6.0)

    first = db.request_referral_withdrawal(3003)
    second = db.request_referral_withdrawal(3003)

    assert first["ok"] is True
    assert second["ok"] is False, "Деньги не должны уходить дважды"
    assert _balance(db, 3003) == 0.0


def test_cooldown_blocks_second_withdrawal(db):
    """После вывода — кулдаун: пополнили баланс, но второй вывод заблокирован 24ч."""
    db.get_or_create_player(3004, "cd")
    _set_balance(db, 3004, 5.0)
    db.request_referral_withdrawal(3004)
    # Снова накопил — но сутки не прошли
    _set_balance(db, 3004, 5.0)

    res = db.request_referral_withdrawal(3004)

    assert res["ok"] is False
    assert res.get("cooldown_hours", 0) >= 1


def test_mark_paid_closes_request_idempotent(db):
    """/payout_done закрывает заявку; повторный вызов — отказ (не задвоить)."""
    db.get_or_create_player(3005, "paid")
    _set_balance(db, 3005, 5.0)
    req = db.request_referral_withdrawal(3005)
    wid = req["withdrawal_id"]

    done1 = db.mark_withdrawal_paid(wid)
    done2 = db.mark_withdrawal_paid(wid)

    assert done1["ok"] is True
    assert done1["user_id"] == 3005
    assert done1["amount"] == 5.0
    assert done2["ok"] is False, "Повторное закрытие запрещено"
    assert _balance(db, 3005) == 0.0, "Деньги остаются списанными"


def test_reject_refunds_and_clears_cooldown(db):
    """/payout_reject возвращает деньги на баланс и снимает кулдаун."""
    db.get_or_create_player(3006, "rej")
    _set_balance(db, 3006, 8.0)
    req = db.request_referral_withdrawal(3006)
    wid = req["withdrawal_id"]
    assert _balance(db, 3006) == 0.0

    rej = db.reject_withdrawal(wid)

    assert rej["ok"] is True
    assert rej["amount"] == 8.0
    assert _balance(db, 3006) == 8.0, "Деньги вернулись на баланс"
    # Кулдаун снят → можно подать новую заявку сразу
    again = db.request_referral_withdrawal(3006)
    assert again["ok"] is True


def test_stats_total_withdrawn_only_counts_completed(db):
    """total_withdrawn_usdt в stats считает только status='completed' заявки."""
    db.get_or_create_player(3010, "stats")
    _set_balance(db, 3010, 5.0)
    req = db.request_referral_withdrawal(3010, username="stats")

    # Pending заявка — НЕ должна считаться как «выведено»
    stats = db.get_referral_stats(3010)
    assert stats["total_withdrawn_usdt"] == 0.0, "Pending не считается"

    db.mark_withdrawal_paid(req["withdrawal_id"])

    stats = db.get_referral_stats(3010)
    assert stats["total_withdrawn_usdt"] == 5.0, "Completed считается"


def test_stats_rejected_not_counted_as_withdrawn(db):
    """Отклонённая заявка не считается как выведенная (деньги вернулись)."""
    db.get_or_create_player(3011, "rej")
    _set_balance(db, 3011, 5.0)
    req = db.request_referral_withdrawal(3011, username="rej")
    db.reject_withdrawal(req["withdrawal_id"])

    stats = db.get_referral_stats(3011)
    assert stats["total_withdrawn_usdt"] == 0.0
    assert _balance(db, 3011) == 5.0  # деньги вернулись на баланс


def test_pending_list_shows_open_requests(db):
    """list_pending_withdrawals возвращает только открытые заявки."""
    db.get_or_create_player(3007, "p1")
    _set_balance(db, 3007, 5.0)
    req = db.request_referral_withdrawal(3007, username="p1")

    pending = db.list_pending_withdrawals()
    ids = [p["id"] for p in pending]
    assert req["withdrawal_id"] in ids

    db.mark_withdrawal_paid(req["withdrawal_id"])
    pending_after = db.list_pending_withdrawals()
    assert req["withdrawal_id"] not in [p["id"] for p in pending_after]
