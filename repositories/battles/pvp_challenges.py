"""PvP-вызовы по нику и учёт недавних дуэлей."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional


class BattlesPvpChallengesMixin:
    def create_pvp_challenge(self, challenger_id: int, target_id: int, ttl_seconds: int = 300) -> Dict[str, Any]:
        now_ts = int(time.time())
        exp_ts = now_ts + max(60, int(ttl_seconds))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?",
                (now_ts,),
            )
            cursor.execute(
                "SELECT id FROM pvp_challenges WHERE target_id = ? AND status = 'pending' AND expires_at > ? LIMIT 1",
                (target_id, now_ts),
            )
            if cursor.fetchone():
                conn.commit()
                return {"ok": False, "reason": "target_has_pending"}
            cursor.execute(
                "INSERT INTO pvp_challenges (challenger_id, target_id, status, expires_at) VALUES (?, ?, 'pending', ?)",
                (challenger_id, target_id, exp_ts),
            )
            cid = int(cursor.lastrowid) if not self._pg else None
            if self._pg and cid is None:
                cursor.execute(
                    "SELECT id FROM pvp_challenges WHERE challenger_id = ? AND target_id = ? AND expires_at = ? ORDER BY id DESC LIMIT 1",
                    (challenger_id, target_id, exp_ts),
                )
                rr = cursor.fetchone()
                cid = int(rr["id"]) if rr else 0
            conn.commit()
            return {"ok": True, "challenge_id": cid, "expires_at": exp_ts}
        finally:
            conn.close()

    def get_incoming_pvp_challenge(self, target_id: int) -> Optional[Dict]:
        now_ts = int(time.time())
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?",
                (now_ts,),
            )
            cursor.execute(
                "SELECT c.id, c.challenger_id, c.target_id, c.expires_at, c.created_at, "
                "p.username AS challenger_username, p.level AS challenger_level, p.rating AS challenger_rating "
                "FROM pvp_challenges c JOIN players p ON p.user_id = c.challenger_id "
                "WHERE c.target_id = ? AND c.status = 'pending' AND c.expires_at > ? "
                "ORDER BY c.created_at DESC LIMIT 1",
                (target_id, now_ts),
            )
            row = cursor.fetchone()
            conn.commit()
            return dict(row) if row else None
        finally:
            conn.close()

    def get_outgoing_pvp_challenges(self, challenger_id: int, limit: int = 10) -> List[Dict]:
        now_ts = int(time.time())
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?",
                (now_ts,),
            )
            cursor.execute(
                "SELECT c.id, c.target_id, c.status, c.expires_at, c.created_at, "
                "p.username AS target_username, p.level AS target_level, p.rating AS target_rating "
                "FROM pvp_challenges c JOIN players p ON p.user_id = c.target_id "
                "WHERE c.challenger_id = ? ORDER BY c.created_at DESC LIMIT ?",
                (challenger_id, int(limit)),
            )
            rows = [dict(r) for r in cursor.fetchall()]
            conn.commit()
            return rows
        finally:
            conn.close()

    def cancel_pvp_challenge(self, challenge_id: int, challenger_id: int) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE id = ? AND challenger_id = ? AND status = 'pending'",
                (int(challenge_id), challenger_id),
            )
            ok = cursor.rowcount > 0
            conn.commit()
            return ok
        finally:
            conn.close()

    def respond_pvp_challenge(self, challenge_id: int, target_id: int, accept: bool) -> Optional[Dict]:
        now_ts = int(time.time())
        status = "accepted" if accept else "declined"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id, challenger_id, target_id, status, expires_at FROM pvp_challenges "
                "WHERE id = ? AND target_id = ? AND status = 'pending' AND expires_at > ? LIMIT 1",
                (challenge_id, target_id, now_ts),
            )
            row = cursor.fetchone()
            if not row:
                return None
            cursor.execute("UPDATE pvp_challenges SET status = ? WHERE id = ?", (status, challenge_id))
            conn.commit()
            out = dict(row)
            out["status"] = status
            return out
        finally:
            conn.close()

    def get_recent_pvp_duel_count(self, user_a: int, user_b: int, hours: int = 24) -> int:
        ua, ub = sorted((int(user_a), int(user_b)))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if self._pg:
                cursor.execute(
                    "SELECT COUNT(*) AS cnt FROM battles WHERE is_bot2 = FALSE "
                    "AND created_at >= (NOW() - (?::text || ' hours')::interval) "
                    "AND LEAST(player1_id, player2_id) = ? AND GREATEST(player1_id, player2_id) = ?",
                    (str(int(hours)), ua, ub),
                )
            else:
                cursor.execute(
                    "SELECT COUNT(*) AS cnt FROM battles WHERE is_bot2 = 0 "
                    "AND created_at >= datetime('now', ?) "
                    "AND min(player1_id, player2_id) = ? AND max(player1_id, player2_id) = ?",
                    (f"-{int(hours)} hours", ua, ub),
                )
            row = cursor.fetchone()
            return int((row or {}).get("cnt", 0))
        finally:
            conn.close()
