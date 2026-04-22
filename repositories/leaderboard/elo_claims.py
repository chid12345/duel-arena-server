"""Elo-топ игроков и weekly_claims."""

from __future__ import annotations

from typing import Dict, List

from db_core import iso_week_key_utc


class LeaderboardEloClaimsMixin:
    def get_pvp_elo_top(self, limit: int = 20) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, username, rating, wins, losses, level FROM players "
                "WHERE wins + losses > 0 ORDER BY rating DESC LIMIT ?",
                (int(limit),),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def weekly_payout_already_done(self, week_key: str, board: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM weekly_leaderboard_payouts WHERE week_key = ? AND board = ? LIMIT 1",
                (week_key, board),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def get_week_key(self) -> str:
        return iso_week_key_utc()

    def has_weekly_claim(self, user_id: int, week_key: str, claim_key: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM weekly_claims WHERE user_id = ? AND week_key = ? AND claim_key = ? LIMIT 1",
                (user_id, week_key, claim_key),
            )
            return bool(cursor.fetchone())
        finally:
            conn.close()

    def add_weekly_claim(self, user_id: int, week_key: str, claim_key: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO weekly_claims (user_id, week_key, claim_key) VALUES (?, ?, ?)",
                (user_id, week_key, claim_key),
            )
            ok = cursor.rowcount > 0
            conn.commit()
            return ok
        finally:
            conn.close()
