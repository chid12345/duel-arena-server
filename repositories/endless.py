"""
repositories/endless.py — режим Натиск (Endless): прогресс, попытки, квесты, топ.
"""

from __future__ import annotations

from datetime import date
from typing import List

from db_core import iso_week_key_utc


class EndlessMixin:
    """Mixin: Натиск — прогресс волн, попытки, квесты, топ."""

    def get_endless_progress(self, user_id: int) -> dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT best_wave, current_wave, current_hp, is_active FROM endless_progress WHERE user_id=?",
                (user_id,),
            )
            row = cursor.fetchone()
            if row:
                return {
                    "best_wave": int(row["best_wave"] or 0),
                    "current_wave": int(row["current_wave"] or 0),
                    "current_hp": int(row["current_hp"] or 0),
                    "is_active": bool(row["is_active"]),
                }
            return {"best_wave": 0, "current_wave": 0, "current_hp": 0, "is_active": False}
        finally:
            conn.close()

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

    def endless_start_run(self, user_id: int, player_hp: int) -> dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO endless_progress (user_id, best_wave, current_wave, current_hp, is_active, updated_at) "
                "VALUES (?,0,1,?,TRUE,CURRENT_TIMESTAMP) "
                "ON CONFLICT(user_id) DO UPDATE SET current_wave=1, current_hp=excluded.current_hp, is_active=TRUE, updated_at=CURRENT_TIMESTAMP",
                (user_id, player_hp),
            )
            conn.commit()
        finally:
            conn.close()
        return self.get_endless_progress(user_id)

    def endless_on_win(self, user_id: int, wave: int, hp_left: int) -> dict:
        next_wave = wave + 1
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO endless_progress (user_id, best_wave, current_wave, current_hp, is_active, updated_at) "
                "VALUES (?,?,?,?,TRUE,CURRENT_TIMESTAMP) "
                "ON CONFLICT(user_id) DO UPDATE SET "
                "best_wave=MAX(endless_progress.best_wave, excluded.best_wave), "
                "current_wave=excluded.current_wave, current_hp=excluded.current_hp, "
                "is_active=TRUE, updated_at=CURRENT_TIMESTAMP",
                (user_id, wave, next_wave, hp_left),
            )
            conn.commit()
        finally:
            conn.close()
        return self.get_endless_progress(user_id)

    def endless_on_loss(self, user_id: int, wave: int) -> dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO endless_progress (user_id, best_wave, current_wave, current_hp, is_active, updated_at) "
                "VALUES (?,?,0,0,FALSE,CURRENT_TIMESTAMP) "
                "ON CONFLICT(user_id) DO UPDATE SET "
                "best_wave=MAX(endless_progress.best_wave, excluded.best_wave), "
                "current_wave=0, current_hp=0, is_active=FALSE, updated_at=CURRENT_TIMESTAMP",
                (user_id, wave),
            )
            conn.commit()
        finally:
            conn.close()
        return self.get_endless_progress(user_id)

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
