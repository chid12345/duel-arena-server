"""Ежедневный бонус."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict

from config import DAILY_BONUS_GOLD, DIAMONDS_DAILY_STREAK


class UsersDailyBonusMixin:
    def get_daily_bonus_status(self, user_id: int) -> Dict:
        """Read-only проверка: можно ли забрать бонус (без клейма)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        today = datetime.now().date()
        cursor.execute("SELECT daily_streak, last_daily FROM players WHERE user_id = ?", (user_id,))
        result = cursor.fetchone()
        conn.close()
        if not result:
            return {"can_claim": True, "streak": 0, "bonus": DAILY_BONUS_GOLD, "diamonds_bonus": 0}
        streak = result["daily_streak"]
        last_daily = result["last_daily"]
        if last_daily:
            if isinstance(last_daily, str):
                last_date = datetime.strptime(last_daily, "%Y-%m-%d").date()
            else:
                last_date = last_daily
            if last_date == today:
                return {"can_claim": False, "streak": streak, "bonus": 0, "diamonds_bonus": 0}
            elif last_date == today - timedelta(days=1):
                streak += 1
            else:
                streak = 1
        bonus = DAILY_BONUS_GOLD
        diamonds_bonus = DIAMONDS_DAILY_STREAK if streak % 7 == 0 else 0
        return {"can_claim": True, "streak": streak, "bonus": bonus, "diamonds_bonus": diamonds_bonus}

    def check_daily_bonus(self, user_id: int) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        today = datetime.now().date()
        cursor.execute("SELECT daily_streak, last_daily FROM players WHERE user_id = ?", (user_id,))
        result = cursor.fetchone()
        if not result:
            conn.close()
            return {"can_claim": True, "streak": 0, "bonus": DAILY_BONUS_GOLD, "diamonds_bonus": 0}
        streak = result["daily_streak"]
        last_daily = result["last_daily"]
        if last_daily:
            if isinstance(last_daily, str):
                last_date = datetime.strptime(last_daily, "%Y-%m-%d").date()
            else:
                last_date = last_daily
            if last_date == today:
                conn.close()
                return {"can_claim": False, "streak": streak, "bonus": 0, "diamonds_bonus": 0}
            elif last_date == today - timedelta(days=1):
                streak += 1
            else:
                streak = 1
        bonus = DAILY_BONUS_GOLD
        extra_d = DIAMONDS_DAILY_STREAK if streak % 7 == 0 else 0
        if streak % 7 == 0:
            bonus += DIAMONDS_DAILY_STREAK
        cursor.execute(
            "UPDATE players SET daily_streak = ?, last_daily = ?, gold = gold + ?, diamonds = diamonds + ? WHERE user_id = ?",
            (streak, today, bonus if bonus > 0 else 0, extra_d, user_id),
        )
        conn.commit()
        conn.close()
        return {"can_claim": True, "streak": streak, "bonus": bonus, "diamonds_bonus": extra_d}
