"""Telegram Stars и CryptoPay (инвойсы)."""

from __future__ import annotations

from typing import Any, Dict, List


class SocialPaymentsMixin:

    def record_stars_bot_payment(self, user_id: int, package_key: str, stars: int) -> None:
        """Вызывается successful_payment_handler при реальной оплате Telegram.
        Записывает source='bot' — ворота для stars_confirm (anti-exploit).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id FROM stars_payments WHERE user_id=? AND package_id=? AND source='bot' "
                "AND created_at > datetime('now', '-15 minutes')",
                (user_id, package_key),
            )
            if cursor.fetchone():
                return
            cursor.execute(
                "INSERT INTO stars_payments (user_id, package_id, diamonds, stars, source) VALUES (?,?,0,?,'bot')",
                (user_id, package_key, stars),
            )
            conn.commit()
        finally:
            conn.close()

    def check_stars_bot_payment(self, user_id: int, package_key: str) -> bool:
        """True если Telegram подтвердил оплату за последние 15 минут."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id FROM stars_payments WHERE user_id=? AND package_id=? AND source='bot' "
                "AND created_at > datetime('now', '-15 minutes')",
                (user_id, package_key),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def mark_stars_tma_delivered(self, user_id: int, package_key: str, stars: int) -> bool:
        """Помечает свиток/премиум как выданный через mini app. False если уже выдано."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id FROM stars_payments WHERE user_id=? AND package_id=? AND source='tma' "
                "AND created_at > datetime('now', '-15 minutes')",
                (user_id, package_key),
            )
            if cursor.fetchone():
                return False
            cursor.execute(
                "INSERT INTO stars_payments (user_id, package_id, diamonds, stars, source) VALUES (?,?,0,?,'tma')",
                (user_id, package_key, stars),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    def confirm_stars_payment(self, user_id: int, package_id: str, diamonds: int, stars: int) -> Dict[str, Any]:
        """Mini app: требует bot-запись, потом зачисляет алмазы.
        Без bot-записи → not_verified (закрывает эксплойт фарма алмазов).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Требуем подтверждение от Telegram-бота
            cursor.execute(
                "SELECT id FROM stars_payments WHERE user_id=? AND package_id=? AND source='bot' "
                "AND created_at > datetime('now', '-15 minutes')",
                (user_id, package_id),
            )
            if not cursor.fetchone():
                return {"ok": False, "reason": "not_verified"}
            # Дедупликация: уже зачислено через mini app
            cursor.execute(
                "SELECT id FROM stars_payments WHERE user_id=? AND package_id=? AND source='tma' "
                "AND created_at > datetime('now', '-15 minutes')",
                (user_id, package_id),
            )
            if cursor.fetchone():
                return {"ok": False, "reason": "already_credited"}
            if diamonds > 0:
                cursor.execute("UPDATE players SET diamonds=diamonds+? WHERE user_id=?", (diamonds, user_id))
            cursor.execute(
                "INSERT INTO stars_payments (user_id, package_id, diamonds, stars, source) VALUES (?,?,?,?,'tma')",
                (user_id, package_id, diamonds, stars),
            )
            conn.commit()
            return {"ok": True, "diamonds": diamonds}
        finally:
            conn.close()

    def create_crypto_invoice(self, user_id: int, invoice_id: int, diamonds: int, asset: str, amount: str, payload: str = "") -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status, payload) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
                (invoice_id, user_id, diamonds, asset.upper(), amount, payload),
            )
            conn.commit()
        finally:
            conn.close()

    def confirm_crypto_invoice(self, invoice_id: int, first_purchase_col: str = None) -> Dict[str, Any]:
        """Атомически подтверждает инвойс: кредитует алмазы и (опционально) ставит флаг скидки первой покупки."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, diamonds, asset, amount, status FROM crypto_invoices WHERE invoice_id = ?",
                (invoice_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "invoice_not_found"}
            if row["status"] == "paid":
                return {"ok": False, "reason": "already_paid"}
            if row["status"] != "pending":
                return {"ok": False, "reason": f"wrong_status:{row['status']}"}
            user_id = int(row["user_id"])
            diamonds = int(row["diamonds"])
            cursor.execute(
                "UPDATE crypto_invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE invoice_id = ? AND status = 'pending'",
                (invoice_id,),
            )
            if cursor.rowcount == 0:
                conn.commit()
                return {"ok": False, "reason": "already_paid"}
            _valid_cols = {"diamond_first_100", "diamond_first_300", "diamond_first_500"}
            if first_purchase_col and first_purchase_col in _valid_cols:
                cursor.execute(
                    f"UPDATE players SET diamonds = diamonds + ?, {first_purchase_col} = 1 WHERE user_id = ?",
                    (diamonds, user_id),
                )
            else:
                cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (diamonds, user_id))
            conn.commit()
            return {
                "ok": True,
                "user_id": user_id,
                "diamonds": diamonds,
                "asset": str(row["asset"] or "TON"),
                "amount": str(row["amount"] or "0"),
            }
        finally:
            conn.close()

    def get_purchases_usdt(self, limit: int = 500) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT c.invoice_id, c.user_id, p.username, c.amount, c.asset,
                          c.status, c.payload, c.created_at, c.paid_at
                   FROM crypto_invoices c
                   LEFT JOIN players p ON p.user_id = c.user_id
                   ORDER BY c.created_at DESC LIMIT ?""",
                (limit,),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def get_purchases_stars(self, limit: int = 500) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT s.id, s.user_id, p.username, s.package_id,
                          s.diamonds, s.stars, s.created_at
                   FROM stars_payments s
                   LEFT JOIN players p ON p.user_id = s.user_id
                   ORDER BY s.created_at DESC LIMIT ?""",
                (limit,),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def mark_items_delivered(self, invoice_id: int) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE crypto_invoices SET items_delivered = 1 WHERE invoice_id = ?",
                (invoice_id,),
            )
            conn.commit()
        finally:
            conn.close()

    def get_paid_undelivered_invoices(self, min_age_seconds: int = 60) -> List[Dict]:
        """Инвойсы оплачены, но вторичная награда ещё не выдана."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT invoice_id, user_id, diamonds, asset, amount, payload, paid_at FROM crypto_invoices "
                "WHERE status = 'paid' AND items_delivered = 0 "
                "AND paid_at < datetime('now', ? || ' seconds') ORDER BY paid_at ASC LIMIT 50",
                (f"-{min_age_seconds}",),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def get_pending_crypto_invoices_older_than(self, seconds: int) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT invoice_id, user_id, diamonds, asset, amount, payload, created_at FROM crypto_invoices "
                "WHERE status = 'pending' AND created_at < datetime('now', ? || ' seconds') ORDER BY created_at ASC LIMIT 50",
                (f"-{seconds}",),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()
