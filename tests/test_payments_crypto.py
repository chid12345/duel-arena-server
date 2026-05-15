"""
tests/test_payments_crypto.py — CryptoPay (USDT) платежи.

Главный инвариант (защита денег пользователей):
    3 пути доставки (webhook + recover + polling) сходятся в confirm_crypto_invoice,
    защищена `UPDATE ... WHERE status='pending'` + проверкой rowcount.
    Все 3 пути → ровно 1 начисление алмазов.
"""
from __future__ import annotations


def _diamonds(db, uid: int) -> int:
    conn = db.get_connection()
    row = conn.execute("SELECT diamonds FROM players WHERE user_id=?", (uid,)).fetchone()
    conn.close()
    return int(row["diamonds"])


def test_create_invoice_idempotent(db):
    """Два create с одним invoice_id → одна запись (INSERT OR IGNORE)."""
    db.get_or_create_player(1001, "u1")
    db.create_crypto_invoice(1001, invoice_id=42, diamonds=100, asset="USDT", amount="3.0")
    db.create_crypto_invoice(1001, invoice_id=42, diamonds=100, asset="USDT", amount="3.0")

    conn = db.get_connection()
    n = conn.execute("SELECT COUNT(*) AS n FROM crypto_invoices WHERE invoice_id=?", (42,)).fetchone()["n"]
    conn.close()
    assert n == 1, "INSERT OR IGNORE должен оставить одну запись"


def test_confirm_pending_credits_diamonds(db):
    """Pending → paid; diamonds начислены."""
    db.get_or_create_player(1002, "u2")
    db.create_crypto_invoice(1002, invoice_id=43, diamonds=100, asset="USDT", amount="3.0")

    res = db.confirm_crypto_invoice(43)

    assert res["ok"] is True
    assert res["diamonds"] == 100
    assert res["asset"] == "USDT"
    assert _diamonds(db, 1002) == 100


def test_confirm_already_paid_returns_already_paid(db):
    """Повторный confirm → already_paid, double-credit НЕ происходит."""
    db.get_or_create_player(1003, "u3")
    db.create_crypto_invoice(1003, invoice_id=44, diamonds=100, asset="USDT", amount="3.0")
    db.confirm_crypto_invoice(44)

    res2 = db.confirm_crypto_invoice(44)

    assert res2["ok"] is False
    assert res2["reason"] == "already_paid"
    assert _diamonds(db, 1003) == 100, "Алмазы НЕ должны быть зачислены дважды"


def test_confirm_unknown_invoice_returns_not_found(db):
    """Несуществующий invoice_id → invoice_not_found."""
    res = db.confirm_crypto_invoice(99999)

    assert res["ok"] is False
    assert res["reason"] == "invoice_not_found"


def test_first_purchase_flag_set_on_confirm(db):
    """С first_purchase_col=diamond_first_100 → флаг поднимается, алмазы зачислены."""
    db.get_or_create_player(1005, "u5")
    db.create_crypto_invoice(1005, invoice_id=46, diamonds=100, asset="USDT", amount="3.0")

    res = db.confirm_crypto_invoice(46, first_purchase_col="diamond_first_100")

    assert res["ok"] is True
    conn = db.get_connection()
    row = conn.execute(
        "SELECT diamonds, diamond_first_100 FROM players WHERE user_id=?", (1005,)
    ).fetchone()
    conn.close()
    assert row["diamonds"] == 100
    assert int(row["diamond_first_100"] or 0) == 1, "Флаг diamond_first_100 должен быть поднят"


def test_get_paid_undelivered_returns_paid_invoices(db):
    """После confirm без mark_items_delivered → запись попадает в выборку recover-job.
    После mark_items_delivered → пропадает.

    Сдвигаем paid_at на 60 секунд назад (как реальный recover-job — он смотрит
    оплаченные инвойсы старше N секунд, чтобы не пересекаться с webhook).
    """
    db.get_or_create_player(1006, "u6")
    db.create_crypto_invoice(1006, invoice_id=47, diamonds=100, asset="USDT", amount="3.0")
    db.confirm_crypto_invoice(47)

    # Симулируем «прошло 60 секунд с paid_at»
    conn = db.get_connection()
    conn.execute(
        "UPDATE crypto_invoices SET paid_at = datetime('now', '-60 seconds') WHERE invoice_id = ?",
        (47,),
    )
    conn.commit()
    conn.close()

    pending = db.get_paid_undelivered_invoices(min_age_seconds=10)

    invoice_ids = [int(p["invoice_id"]) for p in pending]
    assert 47 in invoice_ids, "Платёж paid+!delivered, 60с назад → должен быть в выборке"

    db.mark_items_delivered(47)
    pending2 = db.get_paid_undelivered_invoices(min_age_seconds=10)
    invoice_ids2 = [int(p["invoice_id"]) for p in pending2]
    assert 47 not in invoice_ids2, "После mark_items_delivered должен пропасть"


def test_three_delivery_paths_idempotent(db):
    """⭐ ГЛАВНЫЙ ТЕСТ: webhook + recover + polling = ровно 1 начисление.

    Все три пути доставки USDT-платежа (CryptoPay webhook, фоновый recover-job,
    клиентский polling) сходятся в confirm_crypto_invoice. Защищены атомарным
    UPDATE WHERE status='pending' + проверкой rowcount.
    """
    db.get_or_create_player(1007, "u7")
    db.create_crypto_invoice(1007, invoice_id=48, diamonds=100, asset="USDT", amount="3.0")

    r1 = db.confirm_crypto_invoice(48)  # путь 1: webhook
    r2 = db.confirm_crypto_invoice(48)  # путь 2: recover-job
    r3 = db.confirm_crypto_invoice(48)  # путь 3: client polling

    assert r1["ok"] is True, "Первый confirm должен зачислить"
    assert r2["reason"] == "already_paid", "Второй должен вернуть already_paid"
    assert r3["reason"] == "already_paid", "Третий должен вернуть already_paid"
    assert _diamonds(db, 1007) == 100, (
        f"Алмазы должны быть зачислены РОВНО ОДИН РАЗ, "
        f"получили {_diamonds(db, 1007)} (ожидали 100)"
    )
