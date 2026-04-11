"""Telegram Stars и CryptoPay (инвойсы)."""

from __future__ import annotations

from typing import Any, Dict, List


class SocialPaymentsMixin:
    def confirm_stars_payment(self, user_id: int, package_id: str, diamonds: int, stars: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id FROM stars_payments WHERE user_id = ? AND package_id = ? AND created_at > datetime('now', '-5 minutes')",
                (user_id, package_id),
            )
            if cursor.fetchone():
                return {"ok": False, "reason": "already_credited"}
            if diamonds > 0:
                cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (diamonds, user_id))
            cursor.execute(
                "INSERT INTO stars_payments (user_id, package_id, diamonds, stars, source) VALUES (?, ?, ?, ?, 'tma')",
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

    def confirm_crypto_invoice(self, invoice_id: int) -> Dict[str, Any]:
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
