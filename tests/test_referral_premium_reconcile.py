"""
tests/test_referral_premium_reconcile.py — реферальная комиссия за Premium,
когда реферал зашёл по ссылке ПОСЛЕ покупки.

Корень бага (репорт игрока): «завёл реферала, тот купил премиум — мне ничего не
дали и уведомления не пришло». Комиссия считалась РОВНО в момент подтверждения
оплаты и только если реферер УЖЕ был. Если реферал зашёл по ссылке позже покупки
(или премиум доехал через recovery-цикл, который реферала не звал) — комиссия
терялась навсегда.

reconcile_premium_referral доплачивает задним числом при регистрации/доставке.
Покрывает:
- happy: купил премиум → зарегистрировал реф-связь → комиссия начислена рефереру;
- идемпотентность: повторный reconcile ничего не платит (first_premium_at);
- нет реферера → no-op;
- нет оплаченного premium-инвойса (только алмазы) → no-op;
- запись в referral_rewards + баланс реферера.
"""
from __future__ import annotations


def _balance(db, uid: int) -> float:
    conn = db.get_connection()
    row = conn.execute(
        "SELECT COALESCE(referral_usdt_balance, 0) AS b FROM players WHERE user_id = ?", (uid,)
    ).fetchone()
    conn.close()
    return round(float(row["b"]), 4)


def _setup_pair(db, referrer_id=5101, buyer_id=5102):
    """Создаёт реферера (с кодом) и покупателя. Возвращает реф-код."""
    db.get_or_create_player(referrer_id, "boss")
    db.get_or_create_player(buyer_id, "buddy")
    return db.get_referral_code(referrer_id)


def _paid_premium_invoice(db, buyer_id, invoice_id=900001, amount="8.00"):
    """Создаёт ОПЛАЧЕННЫЙ premium-инвойс на USDT для покупателя."""
    db.create_crypto_invoice(buyer_id, invoice_id, 0, "USDT", amount, payload=f"uid:{buyer_id}:premium:1")
    db.confirm_crypto_invoice(invoice_id)


def test_reconcile_pays_referrer_after_late_registration(db):
    """Купил премиум → ПОТОМ зашёл по реф-ссылке → комиссия доплачивается."""
    code = _setup_pair(db)
    _paid_premium_invoice(db, 5102, amount="8.00")

    ok_ref, rid = db.register_referral(5102, code)
    assert ok_ref is True and rid == 5101

    res = db.reconcile_premium_referral(5102)

    assert res["ok"] is True
    assert res["referrer_id"] == 5101
    # rank 1 → 5% от $8 = 0.40
    assert res["reward_usdt"] == 0.40
    assert _balance(db, 5101) == 0.40


def test_reconcile_is_idempotent(db):
    """Повторный reconcile после успешной выплаты не платит дважды."""
    code = _setup_pair(db)
    _paid_premium_invoice(db, 5102, amount="8.00")
    db.register_referral(5102, code)

    first = db.reconcile_premium_referral(5102)
    second = db.reconcile_premium_referral(5102)

    assert first["ok"] is True
    assert second["ok"] is False, "Второй раз платить нельзя (first_premium_at выставлен)"
    assert _balance(db, 5101) == 0.40, "Баланс не должен задвоиться"


def test_reconcile_noop_without_referrer(db):
    """Нет реф-связи → доплачивать некому."""
    db.get_or_create_player(5102, "buddy")
    _paid_premium_invoice(db, 5102, amount="8.00")

    res = db.reconcile_premium_referral(5102)

    assert res["ok"] is False


def test_reconcile_noop_without_premium_invoice(db):
    """Реферал есть, но премиум не покупал (только алмазы) → нет доплаты."""
    code = _setup_pair(db)
    # Алмазный инвойс, не премиум
    db.create_crypto_invoice(5102, 900002, 500, "USDT", "5.00", payload="uid:5102:diamonds:500")
    db.confirm_crypto_invoice(900002)
    db.register_referral(5102, code)

    res = db.reconcile_premium_referral(5102)

    assert res["ok"] is False
    assert _balance(db, 5101) == 0.0


def test_reconcile_writes_reward_row(db):
    """В referral_rewards появляется запись типа crypto_premium."""
    code = _setup_pair(db)
    _paid_premium_invoice(db, 5102, amount="8.00")
    db.register_referral(5102, code)

    db.reconcile_premium_referral(5102)

    conn = db.get_connection()
    row = conn.execute(
        "SELECT reward_type, reward_usdt FROM referral_rewards WHERE referrer_id = ? AND buyer_id = ?",
        (5101, 5102),
    ).fetchone()
    conn.close()
    assert row is not None
    assert row["reward_type"] == "crypto_premium"
    assert round(float(row["reward_usdt"]), 4) == 0.40
