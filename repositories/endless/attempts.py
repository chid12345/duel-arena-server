"""Попытки за день и бонусные слоты."""

from __future__ import annotations

from datetime import date


class EndlessAttemptsMixin:
    def endless_get_attempts(self, user_id: int) -> dict:
        today = date.today().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT attempts_used, extra_gold, extra_diamond FROM endless_attempts WHERE user_id=? AND attempt_date=?",
                (user_id, today),
            )
            row = cursor.fetchone()
            if row:
                return {"used": int(row["attempts_used"] or 0), "extra_gold": int(row["extra_gold"] or 0), "extra_diamond": int(row["extra_diamond"] or 0)}
            return {"used": 0, "extra_gold": 0, "extra_diamond": 0}
        finally:
            conn.close()

    def endless_use_attempt(self, user_id: int) -> bool:
        today = date.today().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO endless_attempts (user_id, attempt_date, attempts_used, extra_gold, extra_diamond) VALUES (?,?,0,0,0)",
                (user_id, today),
            )
            cursor.execute(
                "UPDATE endless_attempts SET attempts_used = attempts_used + 1 WHERE user_id=? AND attempt_date=?",
                (user_id, today),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    def endless_add_extra(self, user_id: int, kind: str, count: int) -> bool:
        today = date.today().isoformat()
        col = "extra_gold" if kind == "gold" else "extra_diamond"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO endless_attempts (user_id, attempt_date, attempts_used, extra_gold, extra_diamond) VALUES (?,?,0,0,0)",
                (user_id, today),
            )
            cursor.execute(
                f"UPDATE endless_attempts SET {col} = {col} + ? WHERE user_id=? AND attempt_date=?",
                (count, user_id, today),
            )
            conn.commit()
            return True
        finally:
            conn.close()
