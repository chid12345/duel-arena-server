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
        finally:
            conn.close()

        # Активируем premium track в текущем сезоне батл-пасса (Шаг 5).
        # Вызываем после commit основной транзакции, чтобы не блокировать соединение.
        try:
            self.activate_bp_premium(user_id)
        except Exception as e:
            # Не критично для активации основного премиума — логируем и идём дальше.
            import logging
            logging.getLogger(__name__).warning(
                "activate_bp_premium failed uid=%s: %s", user_id, e,
            )

        return {
            "ok": True,
            "premium_until": new_until.isoformat(),
            "days_left": max(0, (new_until - now).days),
            "bonus_diamonds": bonus_diamonds,
        }

    @staticmethod
    def _diamond_first_col(diamonds: int) -> str:
        if diamonds <= 100:
            return "diamond_first_100"
        if diamonds <= 300:
            return "diamond_first_300"
        return "diamond_first_500"

    def is_diamond_first_available(self, user_id: int, diamonds: int = 0) -> bool:
        """True если скидка первой покупки для данного пакета ещё не использована."""
        col = self._diamond_first_col(diamonds)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"SELECT {col} FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return not bool(row and int(row[col] or 0))
        finally:
            conn.close()

    def get_diamond_first_available(self, user_id: int) -> list:
        """Возвращает список пакетов [100, 300, 500], у которых скидка ещё не использована."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT diamond_first_100, diamond_first_300, diamond_first_500 FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return [100, 300, 500]
            result = []
            if not int(row["diamond_first_100"] or 0):
                result.append(100)
            if not int(row["diamond_first_300"] or 0):
                result.append(300)
            if not int(row["diamond_first_500"] or 0):
                result.append(500)
            return result
        finally:
            conn.close()

    def mark_diamond_first_purchased(self, user_id: int, diamonds: int) -> bool:
        """Зачислить алмазы первой покупки и пометить флаг для данного пакета."""
        col = self._diamond_first_col(diamonds)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                f"UPDATE players SET diamonds = diamonds + ?, {col} = 1 "
                f"WHERE user_id = ? AND {col} = 0",
                (diamonds, user_id),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def set_diamond_first_flag(self, user_id: int, diamonds: int = 0) -> None:
        """Только поставить флаг первой покупки для данного пакета (алмазы уже зачислены)."""
        col = self._diamond_first_col(diamonds)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"UPDATE players SET {col} = 1 WHERE user_id = ?", (user_id,))
            conn.commit()
        finally:
            conn.close()

    def is_starter_pack_used(self, user_id: int) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT starter_pack_used FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            return bool(row and int(row["starter_pack_used"] or 0))
        finally:
            conn.close()

    def apply_starter_pack(self, user_id: int) -> Dict[str, Any]:
        """Выдать стартовый пак: 200💎 + 14 дней Premium + 2× scroll_titan. Одноразово."""
        if self.is_starter_pack_used(user_id):
            return {"ok": False, "reason": "already_used"}
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE players SET diamonds = diamonds + 200, starter_pack_used = 1 WHERE user_id = ?",
                (user_id,),
            )
            conn.commit()
        finally:
            conn.close()
        self.add_to_inventory(user_id, "scroll_titan")
        self.add_to_inventory(user_id, "scroll_titan")
        prem = self.activate_premium(user_id, days=14)
        return {"ok": True, "diamonds_added": 200, "premium_days": prem.get("days_left", 14), "scrolls": 2}
