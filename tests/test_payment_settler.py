"""tests/test_payment_settler.py — фоновый авто-разбор CryptoPay-счетов.

Покрывает:
- _recent_undelivered берёт только свежие невыданные счета (старые/выданные — нет)
- settle_recent_pending зовёт recover_one на каждый свежий счёт и считает выданные
"""
from __future__ import annotations


def test_recent_undelivered_filters_old_and_delivered(db):
    """Берём только свежие (в окне) и невыданные счета."""
    import jobs.payment_settler as ps
    ps.db = db  # тестовая БД

    db.get_or_create_player(7101, "u_settle")
    # Свежий невыданный — должен попасть
    db.create_crypto_invoice(7101, 990001, 0, "USDT", "11.99", payload="uid:7101:armor2_equip:armor2_mythic4")
    # Свежий, но уже выданный — НЕ должен попасть
    db.create_crypto_invoice(7101, 990002, 0, "USDT", "11.99", payload="uid:7101:armor2_equip:armor2_mythic1")
    db.mark_items_delivered(990002)
    # Старый невыданный (created_at вне окна) — НЕ должен попасть
    db.create_crypto_invoice(7101, 990003, 0, "USDT", "11.99", payload="uid:7101:armor2_equip:armor2_mythic2")
    conn = db.get_connection()
    conn.execute(
        "UPDATE crypto_invoices SET created_at = ? WHERE invoice_id = ?",
        ("2000-01-01 00:00:00", 990003),
    )
    conn.commit(); conn.close()

    ids = ps._recent_undelivered(ps.SETTLE_WINDOW_HOURS, ps.SETTLE_BATCH_LIMIT)
    assert 990001 in ids
    assert 990002 not in ids, "выданный счёт не должен попадать в разбор"
    assert 990003 not in ids, "старый счёт (вне окна) не должен попадать"


def test_settle_recent_pending_calls_recover(db, monkeypatch):
    """settle_recent_pending зовёт recover_one на каждый свежий счёт и
    считает успешно выданные. recover_one мокаем (он ходит в CryptoPay API)."""
    import jobs.payment_settler as ps
    ps.db = db

    db.get_or_create_player(7102, "u_settle2")
    db.create_crypto_invoice(7102, 991001, 0, "USDT", "11.99", payload="uid:7102:armor2_equip:armor2_mythic4")
    db.create_crypto_invoice(7102, 991002, 0, "USDT", "11.99", payload="uid:7102:armor2_equip:armor2_mythic1")

    called = []

    def fake_recover_one(invoice_id: int) -> dict:
        called.append(invoice_id)
        # первый "оплачен и выдан", второй "ещё не оплачен"
        if invoice_id == 991001:
            return {"ok": True, "invoice_id": invoice_id, "kind": "equip:armor2:armor2_mythic4"}
        return {"ok": False, "reason": "not paid on CryptoPay (status=active)"}

    monkeypatch.setattr(ps, "recover_one", fake_recover_one)

    stats = ps.settle_recent_pending()
    assert 991001 in called and 991002 in called, "должен проверить оба свежих счёта"
    assert stats["delivered"] == 1, "выдан ровно один (оплаченный) счёт"
    assert stats["checked"] >= 2
