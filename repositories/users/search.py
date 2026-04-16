"""Поиск игроков по username."""

from __future__ import annotations

from typing import Dict, List, Optional


class UsersSearchMixin:
    @staticmethod
    def _norm_username(username: str) -> str:
        return (username or "").strip().lstrip("@").lower()

    def find_player_by_username(self, username: str) -> Optional[Dict]:
        un = self._norm_username(username)
        if not un:
            return None
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, username, level, rating, current_hp, max_hp FROM players "
            "WHERE username IS NOT NULL AND LOWER(username) = ? LIMIT 1",
            (un,),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def search_players_by_username(self, query: str, limit: int = 5) -> List[Dict]:
        q = self._norm_username(query)
        if not q:
            return []
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, username, level, rating, current_hp, max_hp FROM players "
            "WHERE username IS NOT NULL AND LOWER(username) LIKE ? "
            "ORDER BY CASE WHEN LOWER(username) = ? THEN 0 ELSE 1 END, rating DESC LIMIT ?",
            (f"%{q}%", q, int(limit)),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
