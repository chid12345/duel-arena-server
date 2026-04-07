"""
repositories/leaderboard.py — PvP топы, недельные выплаты, weekly_claims.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from db_core import iso_week_key_utc, prev_iso_week_bounds_utc, weekly_pvp_rank_reward, weekly_titan_rank_reward

_log = logging.getLogger(__name__)


class LeaderboardMixin:
    """Mixin: PvP/Titan топы, недельные выплаты, weekly_claims."""

    # ── Лидерборды PvP ────────────────────────────────────────────────────────

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

    def get_pvp_elo_top(self, limit: int = 20) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, username, rating, wins, losses FROM players "
                "WHERE wins + losses > 0 ORDER BY rating DESC LIMIT ?",
                (int(limit),),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    # ── Недельные выплаты ─────────────────────────────────────────────────────

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

    def process_weekly_leaderboard_payouts(self) -> Dict[str, Any]:
        week_key, start_dt, end_dt = prev_iso_week_bounds_utc()
        out: Dict[str, Any] = {"week_key": week_key, "pvp_paid": 0, "titan_paid": 0, "invalidate_uids": [], "telegram": []}

        if not self.weekly_payout_already_done(week_key, "pvp"):
            rows = self.get_pvp_weekly_top_for_period(start_dt, end_dt, limit=20)
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                for idx, r in enumerate(rows[:10], 1):
                    d, title = weekly_pvp_rank_reward(idx)
                    if d <= 0:
                        continue
                    uid = int(r["user_id"])
                    cursor.execute(
                        "UPDATE players SET diamonds = diamonds + ?, display_title = ? WHERE user_id = ?",
                        (d, title, uid),
                    )
                    out["invalidate_uids"].append(uid)
                    self.log_metric_event("weekly_pvp_lb_reward", uid, value=d)
                    cid = self.get_player_chat_id(uid)
                    if cid:
                        out["telegram"].append({
                            "chat_id": cid,
                            "text": f"🏆 <b>Награда за неделю {week_key}</b> (топ PvP)\n\nМесто: <b>#{idx}</b>\n+{d} 💎\nТитул: «{title}»",
                        })
                cursor.execute(
                    "INSERT INTO weekly_leaderboard_payouts (week_key, board) VALUES (?, ?)",
                    (week_key, "pvp"),
                )
                conn.commit()
                out["pvp_paid"] = min(10, len(rows))
            except Exception as ex:
                conn.rollback()
                _log.exception("weekly PvP payout failed: %s", ex)
            finally:
                conn.close()

        if not self.weekly_payout_already_done(week_key, "titan"):
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "SELECT s.user_id, p.username, s.max_floor, s.best_at FROM titan_weekly_scores s "
                    "JOIN players p ON p.user_id = s.user_id "
                    "WHERE s.week_key = ? AND s.max_floor > 0 ORDER BY s.max_floor DESC, s.best_at ASC LIMIT 20",
                    (week_key,),
                )
                rows = [dict(x) for x in cursor.fetchall()]
                for idx, r in enumerate(rows[:10], 1):
                    d, title = weekly_titan_rank_reward(idx)
                    if d <= 0:
                        continue
                    uid = int(r["user_id"])
                    cursor.execute(
                        "UPDATE players SET diamonds = diamonds + ?, display_title = ? WHERE user_id = ?",
                        (d, title, uid),
                    )
                    out["invalidate_uids"].append(uid)
                    self.log_metric_event("weekly_titan_lb_reward", uid, value=d)
                    cid = self.get_player_chat_id(uid)
                    if cid:
                        out["telegram"].append({
                            "chat_id": cid,
                            "text": f"🗿 <b>Награда за неделю {week_key}</b> (Башня Титанов)\n\nМесто: <b>#{idx}</b>\n+{d} 💎\nТитул: «{title}»",
                        })
                cursor.execute(
                    "INSERT INTO weekly_leaderboard_payouts (week_key, board) VALUES (?, ?)",
                    (week_key, "titan"),
                )
                conn.commit()
                out["titan_paid"] = min(10, len(rows))
            except Exception as ex:
                conn.rollback()
                _log.exception("weekly Titan payout failed: %s", ex)
            finally:
                conn.close()

        out["invalidate_uids"] = list(dict.fromkeys(out["invalidate_uids"]))
        return out

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
