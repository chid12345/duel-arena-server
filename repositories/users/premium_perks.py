"""Премиум-перки: «Удвоить следующий бой» и др.

Отделено от premium.py по Закону 1 (премиум.py разросся, новые фичи — в свой модуль).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict


class UsersPremiumPerksMixin:
    """Этап 7C редизайна: «Удвоить следующий бой» — 1 раз в день для премов."""

    def get_next_battle_x2_status(self, user_id: int) -> Dict[str, Any]:
        """Статус «удвоить следующий бой» для UI.

        Возвращает:
        - is_premium: нужен премиум, чтобы пользоваться
        - active: заряд выдан, следующий бой удвоится
        - used_today: сегодня уже активировал, новый будет завтра
        - available: премиум, сегодня ещё не активировал и флаг не стоит → можно нажать
        """
        today = datetime.utcnow().strftime("%Y-%m-%d")
        prem = self.get_premium_status(int(user_id))
        is_prem = bool(prem.get("is_active"))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT next_battle_x2, next_battle_x2_date FROM players WHERE user_id = ?",
                (int(user_id),),
            )
            row = cursor.fetchone()
            if not row:
                return {"is_premium": is_prem, "active": False, "used_today": False, "available": is_prem}
            active = bool(int(row["next_battle_x2"] or 0))
            used_today = (row["next_battle_x2_date"] or "") == today
            available = bool(is_prem and not active and not used_today)
            return {
                "is_premium": is_prem,
                "active": active,
                "used_today": used_today,
                "available": available,
            }
        finally:
            conn.close()

    def activate_next_battle_x2(self, user_id: int) -> Dict[str, Any]:
        """Активировать «удвоить следующий бой».

        Условия: премиум активен + сегодня ещё не активировал + флаг ещё не стоит.
        """
        status = self.get_next_battle_x2_status(int(user_id))
        if not status["is_premium"]:
            return {"ok": False, "error": "not_premium"}
        if status["active"]:
            return {"ok": False, "error": "already_active"}
        if status["used_today"]:
            return {"ok": False, "error": "used_today"}
        today = datetime.utcnow().strftime("%Y-%m-%d")
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE players SET next_battle_x2 = 1, next_battle_x2_date = ? WHERE user_id = ?",
                (today, int(user_id)),
            )
            conn.commit()
        finally:
            conn.close()
        return {"ok": True}

    def consume_next_battle_x2(self, user_id: int) -> bool:
        """Если флаг стоит — сбросить и вернуть True (награда удвоится один раз)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE players SET next_battle_x2 = 0 WHERE user_id = ? AND next_battle_x2 = 1",
                (int(user_id),),
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
