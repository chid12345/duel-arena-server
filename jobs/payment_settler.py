"""Фоновый авто-разбор оплаченных, но не выданных CryptoPay-счетов.

Гарантия выдачи БЕЗ webhook: сервер сам каждые N секунд проверяет свежие
неоплаченные счета, спрашивает CryptoPay их статус и выдаёт всё, что
оплачено. Работает даже если игрок закрыл игру — предмет придёт сам.

Идемпотентность: вся выдача идёт через recover_one (tools/recover_crypto_invoice),
который НЕ делает дублей (флаг items_delivered + confirm_crypto_invoice
с UPDATE WHERE status='pending'). Безопасно вызывать сколько угодно раз.

Окно проверки ограничено (свежие счета), чтобы не сканировать всю историю
и не дёргать CryptoPay API по старым истёкшим инвойсам.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from database import db
from tools.recover_crypto_invoice import recover_one

logger = logging.getLogger(__name__)

# Проверяем только счета не старше этого окна (старые неоплаченные истекают сами).
SETTLE_WINDOW_HOURS = 3
# Максимум счетов за один проход — защита от внезапного навала.
SETTLE_BATCH_LIMIT = 40


def _recent_undelivered(hours: int, limit: int) -> list[int]:
    """invoice_id свежих НЕвыданных счетов (items_delivered=0) за окно `hours`.

    Граница времени считается в Python и передаётся параметром, чтобы запрос
    работал одинаково в SQLite (created_at — текст 'YYYY-MM-DD HH:MM:SS') и в
    PostgreSQL (timestamp): лексикографическое сравнение ISO-времени совпадает
    с хронологическим.
    """
    cutoff = (datetime.utcnow() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
    conn = db.get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT invoice_id FROM crypto_invoices "
            "WHERE items_delivered = 0 AND created_at >= ? "
            "ORDER BY created_at DESC LIMIT ?",
            (cutoff, limit),
        )
        return [int(r["invoice_id"]) for r in cur.fetchall()]
    finally:
        conn.close()


def settle_recent_pending() -> dict:
    """Один проход авто-разбора. Возвращает {'checked': N, 'delivered': M}.

    Синхронная (httpx внутри recover_one) — в async-loop вызывать через
    asyncio.to_thread, чтобы не блокировать event loop.
    """
    invoice_ids = _recent_undelivered(SETTLE_WINDOW_HOURS, SETTLE_BATCH_LIMIT)
    delivered = 0
    for iid in invoice_ids:
        try:
            res = recover_one(iid)
            if res.get("ok"):
                delivered += 1
                logger.info("auto-settle delivered invoice=%s kind=%s", iid, res.get("kind"))
        except Exception as e:
            logger.warning("auto-settle invoice=%s err=%s", iid, e)
    if delivered:
        logger.info("auto-settle pass: checked=%s delivered=%s", len(invoice_ids), delivered)
    return {"checked": len(invoice_ids), "delivered": delivered}
