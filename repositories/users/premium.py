"""Premium-подписка."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict


class UsersPremiumMixin:
    def get_premium_status(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT premium_until FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if not row or not row["premium_until"]:
                return {"is_active": False, "days_left": 0, "premium_until": None}
            try:
                until = datetime.fromisoformat(row["premium_until"])
                now = datetime.utcnow()
                if until <= now:
                    return {"is_active": False, "days_left": 0, "premium_until": row["premium_until"]}
                return {"is_active": True, "days_left": max(0, (until - now).days), "premium_until": row["premium_until"]}
            except Exception:
                return {"is_active": False, "days_left": 0, "premium_until": None}
        finally:
            conn.close()

    def activate_premium(self, user_id: int, days: int = 21) -> Dict[str, Any]:
        """Активировать/продлить Premium на N дней. При первой активации — +1000 алмазов."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT premium_until FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            now = datetime.utcnow()
            current_until = None
            if row and row["premium_until"]:
                try:
                    current_until = datetime.fromisoformat(row["premium_until"])
                except Exception:
                    pass
            base = current_until if (current_until and current_until > now) else now
            new_until = base + timedelta(days=days)
            is_renewal = bool(current_until and current_until > now)
            bonus_diamonds = 0 if is_renewal else 1000
            cursor.execute(
                "UPDATE players SET premium_until = ?, diamonds = diamonds + ? WHERE user_id = ?",
                (new_until.isoformat(), bonus_diamonds, user_id),
            )
            conn.commit()
            return {
                "ok": True,
                "premium_until": new_until.isoformat(),
                "days_left": max(0, (new_until - now).days),
                "bonus_diamonds": bonus_diamonds,
            }
        finally:
            conn.close()
