"""Популяция и ребаланс ботов."""

from __future__ import annotations

from config import BOT_COUNT_BY_LEVEL, TARGET_BOT_POPULATION


class BotsLifecycleMixin:
    def rebalance_all_bots(self, conn=None) -> None:
        """Пересчитать статы всех ботов по кривой уровня."""
        own_conn = conn is None
        if own_conn:
            conn = self.get_connection()
        cursor = conn.cursor()
        batch_commit = 60 if self._pg else 10**9
        n_done = 0
        try:
            cursor.execute("SELECT bot_id, level FROM bots")
            rows = cursor.fetchall()
            for row in rows:
                bid = int(row["bot_id"])
                lvl = int(row["level"])
                s, e, c, hp = self._compute_bot_stats_for_level(lvl)
                cursor.execute(
                    "UPDATE bots SET strength = ?, endurance = ?, crit = ?, max_hp = ?, current_hp = ? WHERE bot_id = ?",
                    (s, e, c, hp, hp, bid),
                )
                n_done += 1
                if self._pg and n_done % batch_commit == 0:
                    conn.commit()
            conn.commit()
        finally:
            if own_conn:
                conn.close()

    def bot_inc_win_streak(self, bot_id: int) -> int:
        """Бот выиграл бой → +1 к win_streak. Возвращает новое значение."""
        if not bot_id:
            return 0
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE bots SET win_streak = COALESCE(win_streak,0) + 1 WHERE bot_id = ?", (int(bot_id),))
            conn.commit()
            cur.execute("SELECT win_streak FROM bots WHERE bot_id = ?", (int(bot_id),))
            row = cur.fetchone()
            return int(row["win_streak"]) if row else 0
        finally:
            conn.close()

    def bot_reset_win_streak(self, bot_id: int) -> None:
        """Бот проиграл → серия побед обнуляется."""
        if not bot_id:
            return
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE bots SET win_streak = 0 WHERE bot_id = ?", (int(bot_id),))
            conn.commit()
        finally:
            conn.close()

    def create_initial_bots(self, conn=None):
        """Дополнить популяцию по таблице BOT_COUNT_BY_LEVEL, затем до TARGET_BOT_POPULATION."""
        own_conn = conn is None
        if own_conn:
            conn = self.get_connection()
        cursor = conn.cursor()
        batch_commit_every = 80
        inserted = 0
        try:
            for level, want in sorted(BOT_COUNT_BY_LEVEL.items()):
                cursor.execute("SELECT COUNT(*) AS cnt FROM bots WHERE level = ?", (level,))
                have = int(cursor.fetchone()["cnt"])
                need = max(0, int(want) - have)
                for _ in range(need):
                    bot_data = self._generate_bot_data(level)
                    self._insert_bot_row(cursor, bot_data)
                    inserted += 1
                    if inserted % batch_commit_every == 0:
                        conn.commit()

            cursor.execute("SELECT COUNT(*) AS cnt FROM bots")
            total = int(cursor.fetchone()["cnt"])
            extra_slots = max(0, int(TARGET_BOT_POPULATION) - total)
            for _ in range(extra_slots):
                level = self._random_bot_level_above_10()
                self._insert_bot_row(cursor, self._generate_bot_data(level))
                inserted += 1
                if inserted % batch_commit_every == 0:
                    conn.commit()
            conn.commit()
        finally:
            if own_conn:
                conn.close()
