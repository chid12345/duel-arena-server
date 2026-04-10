"""Недельный топ PvP (SQLite и PostgreSQL)."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List


class LeaderboardPvpWeeklyMixin:
    def get_pvp_weekly_top(self, limit: int = 50) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if self._pg:
                cursor.execute(
                    """SELECT user_id, username, SUM(wins) AS wins, SUM(losses) AS losses, SUM(rating_delta) AS rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = FALSE AND b.created_at >= date_trunc('week', now())
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = FALSE AND b.created_at >= date_trunc('week', now())
                        GROUP BY b.player2_id, p.username
                    ) s GROUP BY user_id, username ORDER BY wins DESC, rating_delta DESC, losses ASC LIMIT ?""",
                    (int(limit),),
                )
            else:
                cursor.execute(
                    """SELECT user_id, username, SUM(wins) AS wins, SUM(losses) AS losses, SUM(rating_delta) AS rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = 0 AND date(b.created_at) >= date('now', 'weekday 1', '-7 days')
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = 0 AND date(b.created_at) >= date('now', 'weekday 1', '-7 days')
                        GROUP BY b.player2_id, p.username
                    ) s GROUP BY user_id, username ORDER BY wins DESC, rating_delta DESC, losses ASC LIMIT ?""",
                    (int(limit),),
                )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def get_pvp_weekly_top_for_period(self, start_dt: datetime, end_dt: datetime, limit: int = 50) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if self._pg:
                cursor.execute(
                    """SELECT user_id, username, SUM(wins) AS wins, SUM(losses) AS losses, SUM(rating_delta) AS rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = FALSE AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = FALSE AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player2_id, p.username
                    ) s GROUP BY user_id, username ORDER BY wins DESC, rating_delta DESC, losses ASC LIMIT ?""",
                    (start_dt, end_dt, start_dt, end_dt, int(limit)),
                )
            else:
                ss = start_dt.strftime("%Y-%m-%d %H:%M:%S")
                ee = end_dt.strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute(
                    """SELECT user_id, username, SUM(wins) AS wins, SUM(losses) AS losses, SUM(rating_delta) AS rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = 0 AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = 0 AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player2_id, p.username
                    ) s GROUP BY user_id, username ORDER BY wins DESC, rating_delta DESC, losses ASC LIMIT ?""",
                    (ss, ee, ss, ee, int(limit)),
                )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()
