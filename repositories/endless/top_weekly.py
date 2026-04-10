"""Топ, недельный и дневной прогресс квестов."""

from __future__ import annotations

from datetime import date

from db_core import iso_week_key_utc


class EndlessTopWeeklyMixin:
    def endless_get_top(self, limit: int = 20) -> list:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT ep.user_id, p.username, ep.best_wave FROM endless_progress ep "
                "JOIN players p ON p.user_id = ep.user_id "
                "WHERE ep.best_wave > 0 ORDER BY ep.best_wave DESC, ep.updated_at ASC LIMIT ?",
                (limit,),
            )
            return [{"user_id": int(r["user_id"]), "username": r["username"], "best_wave": int(r["best_wave"])} for r in cursor.fetchall()]
        finally:
            conn.close()

    def endless_quest_on_win(self, user_id: int, wave: int) -> None:
        today = date.today().isoformat()
        week_key = iso_week_key_utc()
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, endless_wins, reward_claimed) VALUES (?,?,0,0,0,0)",
                (user_id, today),
            )
            cursor.execute(
                "UPDATE daily_quests SET endless_wins = endless_wins + 1 WHERE user_id=? AND quest_date=?",
                (user_id, today),
            )
            cursor.execute(
                "INSERT INTO endless_weekly_scores (user_id, week_key, weekly_wins, best_wave_this_week) VALUES (?,?,1,?) "
                "ON CONFLICT(user_id, week_key) DO UPDATE SET "
                "weekly_wins = weekly_wins + 1, best_wave_this_week = MAX(best_wave_this_week, excluded.best_wave_this_week)",
                (user_id, week_key, wave),
            )
            conn.commit()
        finally:
            conn.close()

    def endless_get_weekly_progress(self, user_id: int, week_key: str) -> dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT weekly_wins, best_wave_this_week FROM endless_weekly_scores WHERE user_id=? AND week_key=?",
                (user_id, week_key),
            )
            row = cursor.fetchone()
            if row:
                return {"weekly_wins": int(row["weekly_wins"] or 0), "best_wave": int(row["best_wave_this_week"] or 0)}
            return {"weekly_wins": 0, "best_wave": 0}
        finally:
            conn.close()

    def endless_get_daily_wins(self, user_id: int) -> int:
        today = date.today().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT endless_wins FROM daily_quests WHERE user_id=? AND quest_date=?",
                (user_id, today),
            )
            row = cursor.fetchone()
            return int(row["endless_wins"] or 0) if row else 0
        finally:
            conn.close()
