"""Сезоны и таблица сезона."""

from __future__ import annotations

from typing import Any, Dict, List, Optional


class ShopSeasonsMixin:
    def get_active_season(self) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM seasons WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def update_season_stats(self, user_id: int, won: bool) -> None:
        season = self.get_active_season()
        if not season:
            return
        sid = season["id"]
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO season_stats (season_id, user_id) VALUES (?, ?)", (sid, user_id))
        if won:
            cursor.execute(
                "UPDATE season_stats SET wins = wins + 1, rating = rating + 10 WHERE season_id = ? AND user_id = ?",
                (sid, user_id),
            )
        else:
            cursor.execute(
                "UPDATE season_stats SET losses = losses + 1, rating = MAX(900, rating - 5) WHERE season_id = ? AND user_id = ?",
                (sid, user_id),
            )
        conn.commit()
        conn.close()

    def get_season_leaderboard(self, season_id: int, limit: int = 10) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT ss.user_id, p.username, ss.wins, ss.losses, ss.rating FROM season_stats ss "
            "JOIN players p ON p.user_id = ss.user_id WHERE ss.season_id = ? "
            "ORDER BY ss.rating DESC, ss.wins DESC LIMIT ?",
            (season_id, limit),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def end_season(self, new_season_name: str) -> Dict[str, Any]:
        season = self.get_active_season()
        if not season:
            return {"ok": False, "reason": "Нет активного сезона"}
        sid = season["id"]
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE seasons SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?", (sid,))
        cursor.execute("SELECT user_id, rating FROM season_stats WHERE season_id = ? ORDER BY rating DESC LIMIT 3", (sid,))
        top3 = cursor.fetchall()
        for i, row in enumerate(top3):
            uid, d, t = row["user_id"], [100, 50, 25][i], ["Чемпион сезона", "Серебро сезона", "Бронза сезона"][i]
            cursor.execute(
                "INSERT INTO season_rewards (season_id, user_id, rank, diamonds, reward_title) VALUES (?, ?, ?, ?, ?)",
                (sid, uid, i + 1, d, t),
            )
            cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (d, uid))
        if self._pg:
            cursor.execute("INSERT INTO seasons (name, status) VALUES (%s, 'active') RETURNING id", (new_season_name,))
            new_sid = int(cursor.fetchone()["id"])
        else:
            cursor.execute("INSERT INTO seasons (name, status) VALUES (?, 'active')", (new_season_name,))
            new_sid = int(cursor.lastrowid)
        conn.commit()
        conn.close()
        return {"ok": True, "ended_season_id": sid, "new_season_id": new_sid, "rewarded": len(top3)}
