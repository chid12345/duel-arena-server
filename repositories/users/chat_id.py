"""Telegram chat_id для рассылок."""

from __future__ import annotations

from typing import Dict, List, Optional


class UsersChatMixin:
    def update_chat_id(self, user_id: int, chat_id: int) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE players SET chat_id = ? WHERE user_id = ?", (chat_id, user_id))
        conn.commit()
        conn.close()

    def get_players_with_chat_id(self, limit: int = 1000) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, chat_id, username FROM players WHERE chat_id IS NOT NULL LIMIT ?",
            (limit,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def get_player_chat_id(self, user_id: int) -> Optional[int]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT chat_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        return int(row["chat_id"]) if row and row["chat_id"] is not None else None
