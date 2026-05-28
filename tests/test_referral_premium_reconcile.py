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


def test_reconcile_all_backfills_existing_referrals(db):
    """Бэкафилл проходит по ВСЕМ рефералам и доначисляет за уже купленный премиум."""
    db.get_or_create_player(5101, "boss")
    code = db.get_referral_code(5101)
    # Два реферала, оба купили премиум ДО появления доплаты
    for i, buyer in enumerate((5201, 5202)):
        db.get_or_create_player(buyer, f"b{i}")
        db.create_crypto_invoice(buyer, 910000 + i, 0, "USDT", "8.00", payload=f"uid:{buyer}:premium:1")
        db.confirm_crypto_invoice(910000 + i)
        db.register_referral(buyer, code)
    # Третий — только зашёл, премиум не покупал
    db.get_or_create_player(5203, "b3")
    db.register_referral(5203, code)

    res = db.reconcile_all_premium_referrals()

    assert res["count"] == 2, "Доначислить должны только двоим (третий премиум не покупал)"
    # 2 × 5% от $8 = 0.40 каждому = 0.80
    assert res["total_usdt"] == 0.80
    assert _balance(db, 5101) == 0.80


def test_reconcile_all_idempotent(db):
    """Повторный бэкафилл не доначисляет повторно."""
    db.get_or_create_player(5101, "boss")
    code = db.get_referral_code(5101)
    db.get_or_create_player(5201, "b")
    db.create_crypto_invoice(5201, 910100, 0, "USDT", "8.00", payload="uid:5201:premium:1")
    db.confirm_crypto_invoice(910100)
    db.register_referral(5201, code)

    first = db.reconcile_all_premium_referrals()
    second = db.reconcile_all_premium_referrals()

    assert first["count"] == 1
    assert second["count"] == 0, "Второй прогон ничего не платит"
    assert _balance(db, 5101) == 0.40


def test_shop_purchase_pays_referrer_by_rank(db):
    """Покупка алмазов за USDT платит рефереру по ранговой шкале (5%/7%/10%)."""
    db.get_or_create_player(5101, "boss")
    # Реферал покупает алмазы на $10
    db.get_or_create_player(5401, "diamond_buyer")
    db.register_referral(5401, db.get_referral_code(5101))

    res = db.process_referral_vip_shop_purchase(5401, usdt=10.0, invoice_id=931000)

    assert res["ok"] is True
    # Ранг 1 (нет премиум-рефералов) → 5%
    assert res["percent"] == 5
    assert res["reward_usdt"] == 0.50  # 10 × 5% = 0.50
    assert _balance(db, 5101) == 0.50


def test_shop_purchase_dedup_by_invoice_id(db):
    """Повторный вызов с тем же invoice_id не платит повторно."""
    db.get_or_create_player(5101, "boss")
    db.get_or_create_player(5401, "buyer")
    db.register_referral(5401, db.get_referral_code(5101))

    first = db.process_referral_vip_shop_purchase(5401, usdt=10.0, invoice_id=931100)
    second = db.process_referral_vip_shop_purchase(5401, usdt=10.0, invoice_id=931100)

    assert first["ok"] is True
    assert second["ok"] is False, "Дубль по invoice_id запрещён"
    assert _balance(db, 5101) == 0.50


def test_shop_stars_uses_new_curse_0015(db):
    """Stars→USDT курс 0.015 — реферер получает столько же, сколько за эквивалентную USDT-покупку."""
    db.get_or_create_player(5101, "boss")
    db.get_or_create_player(5401, "buyer")
    db.register_referral(5401, db.get_referral_code(5101))

    # 536⭐ = $8 по магазину. 5% от $8 = $0.40
    res = db.process_referral_vip_shop_purchase(5401, stars=536, invoice_id=None)

    assert res["ok"] is True
    # 536 × 0.015 × 5% = 0.402 → округление до 0.4020
    assert abs(res["reward_usdt"] - 0.402) < 0.001


def test_reconcile_all_shop_backfills_existing(db):
    """Бэкафилл проходит по всем оплаченным USDT-инвойсам рефералов и доначисляет."""
    db.get_or_create_player(5101, "boss")
    code = db.get_referral_code(5101)
    # Реферал купил 500 алмазов за $5 ДО появления комиссии за алмазы
    db.get_or_create_player(5401, "buyer")
    db.create_crypto_invoice(5401, 932000, 500, "USDT", "5.00", payload="uid:5401:diamonds:500")
    db.confirm_crypto_invoice(932000)
    db.register_referral(5401, code)

    res = db.reconcile_all_shop_referrals()

    assert res["count"] == 1
    assert res["total_usdt"] == 0.25  # $5 × 5% = $0.25
    assert _balance(db, 5101) == 0.25


def test_reconcile_all_shop_idempotent(db):
    """Второй прогон бэкафилла шоп-покупок не задваивает."""
    db.get_or_create_player(5101, "boss")
    code = db.get_referral_code(5101)
    db.get_or_create_player(5401, "buyer")
    db.create_crypto_invoice(5401, 932100, 500, "USDT", "5.00", payload="uid:5401:diamonds:500")
    db.confirm_crypto_invoice(932100)
    db.register_referral(5401, code)

    first = db.reconcile_all_shop_referrals()
    second = db.reconcile_all_shop_referrals()

    assert first["count"] == 1
    assert second["count"] == 0, "Повтор не должен задваивать"
    assert _balance(db, 5101) == 0.25


def test_reconcile_skips_premium_invoices_in_shop_backfill(db):
    """Premium-инвойсы не попадают в shop-бэкафилл (премиум идёт через свой)."""
    db.get_or_create_player(5101, "boss")
    code = db.get_referral_code(5101)
    db.get_or_create_player(5401, "buyer")
    db.create_crypto_invoice(5401, 932200, 0, "USDT", "8.00", payload="uid:5401:premium:1")
    db.confirm_crypto_invoice(932200)
    db.register_referral(5401, code)

    shop_res = db.reconcile_all_shop_referrals()

    assert shop_res["count"] == 0, "Premium-инвойс не должен учитываться в shop-бэкафилле"


def test_reconcile_includes_full_reset_purchases(db):
    """Сброс прогресса (full_reset за USDT) — реальная оплата, должна платить рефереру."""
    db.get_or_create_player(5101, "boss")
    code = db.get_referral_code(5101)
    db.get_or_create_player(5401, "buyer")
    db.create_crypto_invoice(5401, 932300, 0, "USDT", "12.00", payload="uid:5401:full_reset:1")
    db.confirm_crypto_invoice(932300)
    db.register_referral(5401, code)

    res = db.reconcile_all_shop_referrals()

    assert res["count"] == 1, "full_reset должен учитываться (это оплата услуги)"
    # $12 × 5% = $0.60
    assert res["total_usdt"] == 0.60
    assert _balance(db, 5101) == 0.60


def test_purchase_breakdown_premium_vs_diamonds(db):
    """Диагностика различает покупку Premium и покупку алмазов за USDT."""
    db.get_or_create_player(5101, "boss")
    code = db.get_referral_code(5101)
    # Реферал 1 — купил Premium
    db.get_or_create_player(5301, "prem")
    db.create_crypto_invoice(5301, 920000, 0, "USDT", "8.00", payload="uid:5301:premium:1")
    db.confirm_crypto_invoice(920000)
    db.register_referral(5301, code)
    # Реферал 2 — купил 500 алмазов за USDT (как на скрине игрока)
    db.get_or_create_player(5302, "dia")
    db.create_crypto_invoice(5302, 920001, 500, "USDT", "5.00", payload="uid:5302:diamonds:500")
    db.confirm_crypto_invoice(920001)
    db.register_referral(5302, code)

    brk = db.referral_purchase_breakdown()

    assert brk["total_refs"] == 2
    assert brk["with_premium"] == 1
    assert brk["with_diamond_usdt"] == 1
