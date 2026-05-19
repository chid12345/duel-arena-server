"""Аренда mythic-снаряжения: rent / has_active / list_active / cleanup_expired."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List


class RentalRepoMixin:

    def rent_item(self, user_id: int, item_id: str, days: int, stars_paid: int = 0) -> Dict[str, Any]:
        """Создать или продлить аренду на N дней.

        Если активная аренда уже есть — добавляем дни к expires_at.
        Если истекла или нет — начинаем с now()+days.

        🧪 TEST MODE: если в economy.rental_pricing.RENTAL_DURATION_TEST_OVERRIDE_MINUTES
        задано положительное число — берём его как минуты вместо days.
        Используется для быстрой проверки авто-снятия аренды в UI.
        """
        from economy.rental_pricing import RENTAL_DURATION_TEST_OVERRIDE_MINUTES
        now = datetime.utcnow()
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT expires_at FROM equipment_rentals WHERE user_id=? AND item_id=?",
                (int(user_id), item_id),
            )
            row = cur.fetchone()
            if row and row["expires_at"]:
                try:
                    cur_expires = datetime.fromisoformat(str(row["expires_at"]))
                except Exception:
                    cur_expires = now
                base = cur_expires if cur_expires > now else now
            else:
                base = now
            if RENTAL_DURATION_TEST_OVERRIDE_MINUTES and RENTAL_DURATION_TEST_OVERRIDE_MINUTES > 0:
                new_expires = base + timedelta(minutes=int(RENTAL_DURATION_TEST_OVERRIDE_MINUTES))
            else:
                new_expires = base + timedelta(days=int(days))
            cur.execute(
                "DELETE FROM equipment_rentals WHERE user_id=? AND item_id=?",
                (int(user_id), item_id),
            )
            cur.execute(
                "INSERT INTO equipment_rentals (user_id, item_id, expires_at, rented_at, stars_paid) "
                "VALUES (?, ?, ?, ?, ?)",
                (int(user_id), item_id, new_expires.isoformat(), now.isoformat(), int(stars_paid)),
            )
            conn.commit()
            return {"ok": True, "expires_at": new_expires.isoformat()}
        finally:
            conn.close()

    def has_active_rental(self, user_id: int, item_id: str) -> bool:
        """True если у игрока есть активная (не истёкшая) аренда этого предмета."""
        now_iso = datetime.utcnow().isoformat()
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT 1 FROM equipment_rentals WHERE user_id=? AND item_id=? AND expires_at > ?",
                (int(user_id), item_id, now_iso),
            )
            return cur.fetchone() is not None
        finally:
            conn.close()

    def list_active_rentals(self, user_id: int) -> List[Dict[str, Any]]:
        """Список активных аренд игрока: [{item_id, expires_at, seconds_left}]."""
        now = datetime.utcnow()
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT item_id, expires_at FROM equipment_rentals WHERE user_id=? AND expires_at > ?",
                (int(user_id), now.isoformat()),
            )
            rows = cur.fetchall()
            result = []
            for r in rows:
                try:
                    exp = datetime.fromisoformat(str(r["expires_at"]))
                    sec_left = int((exp - now).total_seconds())
                except Exception:
                    sec_left = 0
                result.append({
                    "item_id": r["item_id"],
                    "expires_at": str(r["expires_at"]),
                    "seconds_left": max(0, sec_left),
                })
            return result
        finally:
            conn.close()

    def cleanup_expired_rentals(self, user_id: int | None = None) -> int:
        """Удалить истёкшие аренды. Если user_id=None — все игроки. Вернуть кол-во удалённых."""
        now_iso = datetime.utcnow().isoformat()
        conn = self.get_connection()
        cur = conn.cursor()
        try:
            if user_id is None:
                cur.execute("DELETE FROM equipment_rentals WHERE expires_at <= ?", (now_iso,))
            else:
                cur.execute(
                    "DELETE FROM equipment_rentals WHERE user_id=? AND expires_at <= ?",
                    (int(user_id), now_iso),
                )
            deleted = cur.rowcount
            conn.commit()
            return int(deleted)
        finally:
            conn.close()
