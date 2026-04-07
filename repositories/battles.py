"""
repositories/battles.py — бои, ежедневные квесты, PvP очередь, PvP вызовы по нику.
"""

from __future__ import annotations

import time
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from config import MAX_LEVEL


class BattlesMixin:
    """Mixin: сохранение боёв, квесты, PvP очередь/вызовы."""

    # ── Сохранение боя ────────────────────────────────────────────────────────

    def save_battle(self, battle_data: Dict) -> int:
        conn = self.get_connection()
        cursor = conn.cursor()
        params = (
            battle_data["player1_id"],
            battle_data["player2_id"],
            battle_data["is_bot1"],
            battle_data["is_bot2"],
            battle_data["winner_id"],
            battle_data["result"],
            battle_data["rounds"],
            str(battle_data["details"]),
        )
        if self._pg:
            cursor.execute(
                "INSERT INTO battles "
                "(player1_id, player2_id, is_bot1, is_bot2, winner_id, battle_result, rounds_played, battle_data) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING battle_id",
                params,
            )
            battle_id = int(cursor.fetchone()["battle_id"])
        else:
            cursor.execute(
                "INSERT INTO battles "
                "(player1_id, player2_id, is_bot1, is_bot2, winner_id, battle_result, rounds_played, battle_data) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                params,
            )
            battle_id = int(cursor.lastrowid)
        conn.commit()
        conn.close()
        return battle_id

    # ── Ежедневные квесты ─────────────────────────────────────────────────────

    def update_daily_quest_progress(self, user_id: int, won_battle: bool = False):
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?, ?, 0, 0, 0)",
            (user_id, today),
        )
        cursor.execute(
            "UPDATE daily_quests SET battles_played = battles_played + 1, battles_won = battles_won + ? WHERE user_id = ? AND quest_date = ?",
            (1 if won_battle else 0, user_id, today),
        )
        conn.commit()
        conn.close()

    def get_daily_quest_status(self, user_id: int) -> Dict[str, Any]:
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?, ?, 0, 0, 0)",
            (user_id, today),
        )
        cursor.execute(
            "SELECT battles_played, battles_won, reward_claimed FROM daily_quests WHERE user_id = ? AND quest_date = ?",
            (user_id, today),
        )
        row = cursor.fetchone()
        conn.commit()
        conn.close()
        battles_played = int(row["battles_played"] or 0) if row else 0
        battles_won    = int(row["battles_won"]    or 0) if row else 0
        endless_wins   = int(row["endless_wins"]   or 0) if row and "endless_wins" in (row.keys() if hasattr(row, "keys") else dir(row)) else 0
        reward_claimed = bool(row["reward_claimed"]) if row else False
        return {
            "battles_played": battles_played,
            "battles_won": battles_won,
            "endless_wins": endless_wins,
            "reward_claimed": reward_claimed,
            "is_completed": battles_played >= 5 and battles_won >= 3,   # было: 3 боя + 1 победа
            "endless_quest_completed": endless_wins >= 3,
            # Метаданные квеста для UI
            "quest_target_played": 5,
            "quest_target_won": 3,
        }

    def claim_daily_quest_reward(self, user_id: int, gold_reward: int = 55, xp_reward: int = 150) -> Dict[str, Any]:
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT battles_played, battles_won, reward_claimed FROM daily_quests WHERE user_id = ? AND quest_date = ?",
            (user_id, today),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Квест еще не начат"}
        if row["reward_claimed"]:
            conn.close()
            return {"ok": False, "reason": "Награда уже получена"}
        if row["battles_played"] < 5 or row["battles_won"] < 3:
            conn.close()
            return {"ok": False, "reason": "Квест еще не выполнен"}
        cursor.execute(
            "UPDATE daily_quests SET reward_claimed = 1 WHERE user_id = ? AND quest_date = ? AND reward_claimed = 0",
            (user_id, today),
        )
        if cursor.rowcount == 0:
            conn.close()
            return {"ok": False, "reason": "Награда уже получена"}
        cursor.execute(
            "UPDATE players SET gold = gold + ?, exp = exp + ? WHERE user_id = ?",
            (gold_reward, xp_reward, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "gold": gold_reward, "xp": xp_reward}

    # ── PvP очередь ───────────────────────────────────────────────────────────

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

    # ── PvP вызовы по нику ────────────────────────────────────────────────────

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
