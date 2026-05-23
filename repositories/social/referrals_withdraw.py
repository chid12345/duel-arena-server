"""Ручной вывод USDT по реферальному балансу.

Поток (ручной режим — владелец платит сам через @CryptoBot):
1. request_referral_withdrawal — АТОМАРНО списывает баланс и ставит кулдаун
   (защита от двойного вывода), создаёт заявку status='pending'.
2. Владелец переводит USDT вручную, потом /payout_done <id>.
3. reject_withdrawal — отклонить заявку и вернуть деньги игроку.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


class SocialReferralWithdrawMixin:
    def request_referral_withdrawal(
        self, user_id: int, username: Optional[str] = None
    ) -> Dict[str, Any]:
        """Создаёт заявку на вывод. Баланс списывается СРАЗУ (атомарный захват)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COALESCE(referral_usdt_balance, 0) AS bal, username, last_withdrawal_at "
                "FROM players WHERE user_id = ?",
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
            now = datetime.utcnow().isoformat()
            # Атомарный захват: списываем баланс и ставим кулдаун ОДНИМ UPDATE с
            # охранным условием. Параллельный второй запрос увидит баланс < суммы
            # → rowcount=0 → деньги дважды не уйдут (фикс гонки двойного вывода).
            cursor.execute(
                "UPDATE players SET referral_usdt_balance = referral_usdt_balance - ?, "
                "last_withdrawal_at = ? WHERE user_id = ? AND COALESCE(referral_usdt_balance, 0) >= ?",
                (balance, now, user_id, balance),
            )
            if cursor.rowcount != 1:
                conn.rollback()
                return {"ok": False, "reason": "Заявка уже в обработке"}
            uname = (username or row["username"] or "")
            cursor.execute(
                "INSERT INTO referral_withdrawals (user_id, amount, status, telegram_username, created_at) "
                "VALUES (?, ?, 'pending', ?, ?)",
                (user_id, balance, uname, now),
            )
            wid = cursor.lastrowid
            conn.commit()
            return {
                "ok": True,
                "pending": True,
                "amount": balance,
                "withdrawal_id": int(wid),
                "username": uname,
            }
        finally:
            conn.close()

    def list_pending_withdrawals(self, limit: int = 20) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id, user_id, amount, telegram_username, created_at FROM referral_withdrawals "
                "WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?",
                (int(limit),),
            )
            return [
                {
                    "id": int(r["id"]),
                    "user_id": int(r["user_id"]),
                    "amount": round(float(r["amount"]), 4),
                    "username": r["telegram_username"] or "",
                    "created_at": str(r["created_at"]),
                }
                for r in cursor.fetchall()
            ]
        finally:
            conn.close()

    def mark_withdrawal_paid(self, withdrawal_id: int) -> Dict[str, Any]:
        """Владелец подтвердил перевод — закрываем заявку (деньги уже списаны)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, amount, status FROM referral_withdrawals WHERE id = ?",
                (withdrawal_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "Заявка не найдена"}
            if row["status"] != "pending":
                return {"ok": False, "reason": f"Заявка уже '{row['status']}'"}
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE referral_withdrawals SET status = 'completed', processed_at = ? "
                "WHERE id = ? AND status = 'pending'",
                (now, withdrawal_id),
            )
            if cursor.rowcount != 1:
                conn.rollback()
                return {"ok": False, "reason": "Заявка уже обработана"}
            conn.commit()
            return {"ok": True, "user_id": int(row["user_id"]), "amount": round(float(row["amount"]), 4)}
        finally:
            conn.close()

    def reject_withdrawal(self, withdrawal_id: int) -> Dict[str, Any]:
        """Отклонить заявку: вернуть деньги на баланс и снять кулдаун."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, amount, status FROM referral_withdrawals WHERE id = ?",
                (withdrawal_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "Заявка не найдена"}
            if row["status"] != "pending":
                return {"ok": False, "reason": f"Заявка уже '{row['status']}'"}
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE referral_withdrawals SET status = 'rejected', processed_at = ? "
                "WHERE id = ? AND status = 'pending'",
                (now, withdrawal_id),
            )
            if cursor.rowcount != 1:
                conn.rollback()
                return {"ok": False, "reason": "Заявка уже обработана"}
            amount = round(float(row["amount"]), 4)
            # Возврат средств и сброс кулдауна — игрок может попробовать снова.
            cursor.execute(
                "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + ?, "
                "last_withdrawal_at = NULL WHERE user_id = ?",
                (amount, int(row["user_id"])),
            )
            conn.commit()
            return {"ok": True, "user_id": int(row["user_id"]), "amount": amount}
        finally:
            conn.close()
