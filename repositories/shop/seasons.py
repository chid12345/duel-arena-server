"""Сезоны и таблица сезона."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

_SEASON_LB_CACHE: List[Dict] = []
_SEASON_LB_CACHE_ID: int = -1
_SEASON_LB_CACHE_TS: float = 0.0
_SEASON_LB_TTL = 300  # 5 минут

# Награды за место в сезоне: (gold, diamonds, title)
_SEASON_RANK_REWARDS = {
    1:  (500, 200, "Чемпион сезона"),
    2:  (300, 120, "Вице-чемпион"),
    3:  (200, 75,  "Бронзовый боец"),
    4:  (100, 40,  "Элита арены"),
    5:  (100, 40,  "Элита арены"),
    6:  (50,  20,  "Участник топа"),
    7:  (50,  20,  "Участник топа"),
    8:  (50,  20,  "Участник топа"),
    9:  (50,  20,  "Участник топа"),
    10: (50,  20,  "Участник топа"),
}

SEASON_DURATION_DAYS = 14


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
        global _SEASON_LB_CACHE, _SEASON_LB_CACHE_ID, _SEASON_LB_CACHE_TS
        now = time.time()
        if _SEASON_LB_CACHE and _SEASON_LB_CACHE_ID == season_id and now - _SEASON_LB_CACHE_TS < _SEASON_LB_TTL:
            return _SEASON_LB_CACHE[:limit]
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
        _SEASON_LB_CACHE = rows
        _SEASON_LB_CACHE_ID = season_id
        _SEASON_LB_CACHE_TS = now
        return rows

    def end_season(self, new_season_name: str) -> Dict[str, Any]:
        global _SEASON_LB_CACHE, _SEASON_LB_CACHE_TS
        _SEASON_LB_CACHE = []
        _SEASON_LB_CACHE_TS = 0.0
        season = self.get_active_season()
        if not season:
            return {"ok": False, "reason": "Нет активного сезона"}
        sid = season["id"]
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE seasons SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?", (sid,))
        cursor.execute(
            "SELECT ss.user_id, ss.rating, p.username FROM season_stats ss "
            "JOIN players p ON p.user_id = ss.user_id "
            "WHERE ss.season_id = ? ORDER BY ss.rating DESC LIMIT 10",
            (sid,),
        )
        top10 = [dict(r) for r in cursor.fetchall()]

        telegram_msgs: List[Dict] = []
        for i, row in enumerate(top10, 1):
            gold, diamonds, title = _SEASON_RANK_REWARDS[i]
            uid = int(row["user_id"])
            cursor.execute(
                "INSERT INTO season_rewards (season_id, user_id, rank, gold, diamonds, reward_title) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (sid, uid, i, gold, diamonds, title),
            )
            cursor.execute(
                "UPDATE players SET gold = gold + ?, diamonds = diamonds + ?, display_title = ? WHERE user_id = ?",
                (gold, diamonds, title, uid),
            )
            cid = self.get_player_chat_id(uid)
            if cid:
                medal = ("🥇", "🥈", "🥉")[i - 1] if i <= 3 else f"#{i}"
                telegram_msgs.append({
                    "chat_id": cid,
                    "text": (
                        f"🏆 <b>Сезон завершён!</b>\n\n"
                        f"Твоё место: <b>{medal}</b>\n"
                        f"Получено: <b>+{gold}💰 +{diamonds}💎</b>\n"
                        f"Титул: «{title}»\n\n"
                        f"Новый сезон уже начался — вперёд!"
                    ),
                })

        if self._pg:
            cursor.execute("INSERT INTO seasons (name, status) VALUES (%s, 'active') RETURNING id", (new_season_name,))
            new_sid = int(cursor.fetchone()["id"])
        else:
            cursor.execute("INSERT INTO seasons (name, status) VALUES (?, 'active')", (new_season_name,))
            new_sid = int(cursor.lastrowid)
        conn.commit()
        conn.close()
        return {
            "ok": True,
            "ended_season_id": sid,
            "new_season_id": new_sid,
            "rewarded": len(top10),
            "telegram": telegram_msgs,
        }
