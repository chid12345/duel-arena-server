"""События метрик и health dashboard."""

from __future__ import annotations

from typing import Any, Dict, Optional


class UsersMetricsMixin:
    def log_metric_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        value: int = 0,
        duration_ms: int = 0,
    ):
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO metric_events (event_type, user_id, value, duration_ms) VALUES (?, ?, ?, ?)",
            (event_type, user_id, value, duration_ms),
        )
        conn.commit()
        conn.close()

    def get_health_metrics(self) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total_players FROM players")
        total_players = cursor.fetchone()["total_players"]
        cursor.execute(
            "SELECT COUNT(DISTINCT user_id) AS dau FROM metric_events "
            "WHERE event_type = 'command_start' AND created_at >= datetime('now', '-1 day')"
        )
        dau = cursor.fetchone()["dau"] or 0
        cursor.execute(
            "SELECT COUNT(*) AS battles_hour FROM metric_events "
            "WHERE event_type IN ('battle_ended', 'battle_ended_afk') "
            "AND created_at >= datetime('now', '-1 hour')"
        )
        battles_hour = cursor.fetchone()["battles_hour"] or 0
        cursor.execute(
            "SELECT AVG(duration_ms) AS avg_duration_ms FROM metric_events "
            "WHERE event_type IN ('battle_ended', 'battle_ended_afk') "
            "AND duration_ms > 0 AND created_at >= datetime('now', '-1 day')"
        )
        avg_ms = cursor.fetchone()["avg_duration_ms"]
        conn.close()
        return {
            "total_players": total_players,
            "dau": dau,
            "battles_hour": battles_hour,
            "avg_battle_duration_ms": int(avg_ms) if avg_ms else 0,
        }
