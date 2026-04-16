"""История клана: запись событий + чтение ленты.

Типы событий (event_type):
  join          — игрок вступил
  leave         — игрок вышел
  kick          — лидер исключил игрока
  autokick      — авто-кик за 30 дней неактивности
  transfer      — передача лидерства
  achievement   — разблокировано достижение
  season_reward — клан получил награду сезона
  level_up      — повышение уровня клана
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class SocialClanHistoryMixin:

    def log_clan_event(
        self,
        clan_id: int,
        event_type: str,
        actor_id: Optional[int] = None,
        actor_name: str = "",
        extra: str = "",
    ) -> None:
        """Безопасно (без падения) записать событие в clan_history."""
        if not clan_id:
            return
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO clan_history (clan_id, event_type, actor_id, actor_name, extra) "
                "VALUES (?, ?, ?, ?, ?)",
                (int(clan_id), str(event_type), int(actor_id or 0),
                 str(actor_name or "")[:32], str(extra or "")[:64]),
            )
            conn.commit(); conn.close()
        except Exception as e:
            logger.warning("log_clan_event failed: %s", e)

    def get_clan_history(self, clan_id: int, limit: int = 30) -> List[Dict[str, Any]]:
        if not clan_id:
            return []
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, event_type, actor_id, actor_name, extra, created_at "
            "FROM clan_history WHERE clan_id = ? ORDER BY id DESC LIMIT ?",
            (int(clan_id), int(limit)),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
