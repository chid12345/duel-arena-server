"""Прогресс волн и исходы раундов."""

from __future__ import annotations


class EndlessProgressRunMixin:
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
        # При поражении засчитываем как пройденную предыдущую волну.
        # wave = волна на которой проиграл → реально пройдено wave-1.
        completed = max(0, int(wave) - 1)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO endless_progress (user_id, best_wave, current_wave, current_hp, is_active, updated_at) "
                "VALUES (?,?,0,0,FALSE,CURRENT_TIMESTAMP) "
                "ON CONFLICT(user_id) DO UPDATE SET "
                "best_wave=MAX(endless_progress.best_wave, excluded.best_wave), "
                "current_wave=0, current_hp=0, is_active=FALSE, updated_at=CURRENT_TIMESTAMP",
                (user_id, completed),
            )
            conn.commit()
        finally:
            conn.close()
        return self.get_endless_progress(user_id)
