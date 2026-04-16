"""Сезоны клана: 7 дней, ротация, награды 1-3 мест.

Награды (зачисляются всем участникам клана-победителя):
  1 место — 500 🪙 + 5 💎 каждому участнику
  2 место — 300 🪙 + 3 💎 каждому участнику
  3 место — 150 🪙 + 1 💎 каждому участнику
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

SEASON_LENGTH_DAYS = 7
SEASON_REWARDS = [
    (500, 5),  # 1 место: gold, diamonds (на каждого участника)
    (300, 3),  # 2 место
    (150, 1),  # 3 место
]


class SocialClanSeasonsMixin:

    def get_current_season(self) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, started_at, ends_at, ended FROM clan_seasons "
            "WHERE ended = 0 ORDER BY id DESC LIMIT 1"
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def ensure_active_season(self) -> Dict[str, Any]:
        """Создать новый сезон если активного нет. Возвращает активный сезон."""
        cur = self.get_current_season()
        if cur:
            return cur
        now = datetime.now(timezone.utc)
        ends = now + timedelta(days=SEASON_LENGTH_DAYS)
        conn = self.get_connection()
        cursor = conn.cursor()
        if self._pg:
            cursor.execute(
                "INSERT INTO clan_seasons (started_at, ends_at, ended) "
                "VALUES (%s, %s, 0) RETURNING id",
                (now, ends),
            )
            sid = int(cursor.fetchone()["id"])
        else:
            cursor.execute(
                "INSERT INTO clan_seasons (started_at, ends_at, ended) VALUES (?, ?, 0)",
                (now.strftime("%Y-%m-%d %H:%M:%S"), ends.strftime("%Y-%m-%d %H:%M:%S")),
            )
            sid = int(cursor.lastrowid)
        # Сброс season_score у всех кланов (новый сезон = чистый старт)
        cursor.execute("UPDATE clans SET season_score = 0, season_id = ?", (sid,))
        conn.commit(); conn.close()
        return {"id": sid, "started_at": now, "ends_at": ends, "ended": 0}

    def get_season_top(self, limit: int = 10) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, tag, COALESCE(emblem,'neutral') as emblem, "
            "COALESCE(season_score,0) as season_score, level, "
            "(SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count "
            "FROM clans c WHERE COALESCE(season_score,0) > 0 "
            "ORDER BY season_score DESC LIMIT ?",
            (int(limit),),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def end_season_and_reward(self) -> Dict[str, Any]:
        """Закрыть текущий сезон, выдать награды топ-3, открыть новый."""
        cur = self.get_current_season()
        if not cur:
            self.ensure_active_season()
            return {"ok": True, "rewarded": 0, "reason": "no active season"}
        now = datetime.now(timezone.utc)
        ends_at = cur.get("ends_at")
        # парсим ends_at
        try:
            if isinstance(ends_at, str):
                ends_dt = datetime.fromisoformat(ends_at.replace(" ", "T").replace("Z", "+00:00"))
            else:
                ends_dt = ends_at
            if ends_dt.tzinfo is None:
                ends_dt = ends_dt.replace(tzinfo=timezone.utc)
        except Exception:
            ends_dt = now  # форс закрытие
        if now < ends_dt:
            return {"ok": False, "reason": "season not ended yet"}

        top = self.get_season_top(limit=3)
        rewarded = 0
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            for idx, clan in enumerate(top):
                gold, diamonds = SEASON_REWARDS[idx]
                cursor.execute(
                    "SELECT user_id FROM clan_members WHERE clan_id = ?",
                    (int(clan["id"]),),
                )
                members = [int(r["user_id"]) for r in cursor.fetchall()]
                for uid in members:
                    cursor.execute(
                        "UPDATE players SET gold = gold + ?, diamonds = diamonds + ? "
                        "WHERE user_id = ?",
                        (gold, diamonds, uid),
                    )
                    rewarded += 1
                # Запись в историю клана
                try:
                    cursor.execute(
                        "INSERT INTO clan_history (clan_id, event_type, actor_id, actor_name, extra) "
                        "VALUES (?, 'season_reward', 0, '', ?)",
                        (int(clan["id"]), f"place {idx+1}: +{gold}g +{diamonds}d each"),
                    )
                except Exception:
                    pass
            # Закрыть сезон
            cursor.execute("UPDATE clan_seasons SET ended = 1 WHERE id = ?", (int(cur["id"]),))
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.warning("end_season failed: %s", e)
            conn.close()
            return {"ok": False, "reason": str(e)}
        conn.close()
        # Открыть новый сезон (сбросит season_score)
        new_season = self.ensure_active_season()
        return {"ok": True, "rewarded": rewarded, "new_season_id": new_season["id"]}
