"""Клановый чат."""

from __future__ import annotations

from typing import Any, Dict, List


class SocialClanChatMixin:
    """Сообщения клана."""

    def send_clan_message(self, clan_id: int, user_id: int, username: str, message: str) -> bool:
        message = (message or "").strip()[:200]
        if not message:
            return False
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT 1 FROM clan_members WHERE user_id = ? AND clan_id = ?", (user_id, clan_id))
            if not cursor.fetchone():
                return False
            cursor.execute(
                "INSERT INTO clan_messages (clan_id, user_id, username, message) VALUES (?, ?, ?, ?)",
                (clan_id, user_id, username, message),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    def get_clan_messages(self, clan_id: int, limit: int = 40) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id, user_id, username, message, strftime('%H:%M', created_at) AS time_str "
                "FROM clan_messages WHERE clan_id = ? ORDER BY created_at DESC LIMIT ?",
                (clan_id, int(limit)),
            )
            rows = cursor.fetchall()
            return [dict(r) for r in reversed(rows)]
        finally:
            conn.close()
