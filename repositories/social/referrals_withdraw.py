"""Вывод USDT по реферальному балансу."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict


class SocialReferralWithdrawMixin:
    def request_referral_withdrawal(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COALESCE(referral_usdt_balance, 0) AS bal, username, last_withdrawal_at FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "Игрок не найден"}
            balance = round(float(row["bal"]), 4)
            if balance < self.WITHDRAW_MIN_USDT:
                return {
                    "ok": False,
                    "reason": f"Минимум для вывода: ${self.WITHDRAW_MIN_USDT:.0f} USDT (у вас ${balance:.2f})",
                    "balance": balance,
                }
            if row["last_withdrawal_at"]:
                try:
                    elapsed = (
                        datetime.utcnow() - datetime.fromisoformat(str(row["last_withdrawal_at"]))
                    ).total_seconds()
                    if elapsed < self.WITHDRAW_COOLDOWN:
                        remaining_h = max(1, int((self.WITHDRAW_COOLDOWN - elapsed) / 3600) + 1)
                        return {
                            "ok": False,
                            "reason": f"Следующий вывод через {remaining_h}ч (раз в сутки)",
                            "cooldown_hours": remaining_h,
                        }
                except Exception:
                    pass
            return {"ok": True, "amount": balance, "username": row["username"] or ""}
        finally:
            conn.close()

    def confirm_referral_withdrawal(self, user_id: int, amount: float) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE players SET referral_usdt_balance = MAX(0, COALESCE(referral_usdt_balance,0) - ?), "
                "last_withdrawal_at = ? WHERE user_id = ?",
                (amount, now, user_id),
            )
            cursor.execute(
                "INSERT INTO referral_withdrawals (user_id, amount, status, processed_at) VALUES (?, ?, 'completed', ?)",
                (user_id, amount, now),
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()
