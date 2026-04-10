"""Очередь случайного PvP."""

from __future__ import annotations

from typing import Dict, Optional

from config import MAX_LEVEL


class BattlesPvpQueueMixin:
    def pvp_enqueue(self, user_id: int, level: int, chat_id: int, message_id: Optional[int] = None) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (?, ?, ?, ?)",
            (user_id, level, chat_id, message_id),
        )
        conn.commit()
        conn.close()

    def pvp_dequeue(self, user_id: int) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM pvp_queue WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()

    def pvp_find_opponent(self, user_id: int, level: int, range_max: int = 3) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        lo = max(1, level - range_max)
        hi = min(MAX_LEVEL, level + range_max)
        cursor.execute(
            "SELECT * FROM pvp_queue WHERE user_id != ? AND level BETWEEN ? AND ? "
            "ORDER BY ABS(level - ?) ASC, joined_at ASC LIMIT 1",
            (user_id, lo, hi, level),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def pvp_clear_stale(self, older_than_seconds: int = 60) -> int:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM pvp_queue WHERE joined_at < datetime('now', ? || ' seconds')",
            (f"-{older_than_seconds}",),
        )
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted
