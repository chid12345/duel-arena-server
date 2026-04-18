"""Mixin: удары по боссу — world_boss_hits (лог, топ, лента)."""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

log = logging.getLogger(__name__)


class WorldBossHitsMixin:

    def log_wb_hit(
        self,
        spawn_id: int,
        user_id: int,
        damage: int,
        is_crit: bool = False,
        is_vulnerability_window: bool = False,
    ) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO world_boss_hits
                  (spawn_id, user_id, damage, is_crit, is_vulnerability_window)
               VALUES (?,?,?,?,?)""",
            (int(spawn_id), int(user_id), int(damage),
             1 if is_crit else 0, 1 if is_vulnerability_window else 0),
        )
        conn.commit()
        if not self._pg:
            hit_id = cur.lastrowid
        else:
            cur.execute(
                "SELECT hit_id FROM world_boss_hits WHERE spawn_id=? AND user_id=? "
                "ORDER BY hit_id DESC LIMIT 1",
                (int(spawn_id), int(user_id)),
            )
            row = cur.fetchone()
            hit_id = row["hit_id"] if row else 0
        conn.close()
        return int(hit_id)

    def get_wb_total_damage_by_user(self, spawn_id: int, user_id: int) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT COALESCE(SUM(damage),0) AS d FROM world_boss_hits "
            "WHERE spawn_id=? AND user_id=?",
            (int(spawn_id), int(user_id)),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["d"]) if row else 0

    def get_wb_total_damage(self, spawn_id: int) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT COALESCE(SUM(damage),0) AS d FROM world_boss_hits WHERE spawn_id=?",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["d"]) if row else 0

    def get_wb_top_damagers(self, spawn_id: int, limit: int = 3) -> List[Dict[str, Any]]:
        """Топ-N игроков по суммарному урону в рейде (для отображения и сундука)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, SUM(damage) AS total_damage, COUNT(*) AS hits "
            "FROM world_boss_hits WHERE spawn_id=? "
            "GROUP BY user_id ORDER BY total_damage DESC LIMIT ?",
            (int(spawn_id), int(limit)),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_wb_last_hitter(self, spawn_id: int) -> Optional[int]:
        """Кто нанёс самый последний удар по боссу (для сундука last-hit)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id FROM world_boss_hits WHERE spawn_id=? "
            "ORDER BY hit_id DESC LIMIT 1",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["user_id"]) if row else None

    def get_wb_recent_hits(self, spawn_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Последние N ударов — для живой ленты «кто бьёт сейчас»."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT hit_id, user_id, damage, is_crit, created_at "
            "FROM world_boss_hits WHERE spawn_id=? "
            "ORDER BY hit_id DESC LIMIT ?",
            (int(spawn_id), int(limit)),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_wb_participants_count(self, spawn_id: int) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(DISTINCT user_id) AS c FROM world_boss_hits WHERE spawn_id=?",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["c"]) if row else 0

    def get_wb_hits_today_count(self, user_id: int) -> int:
        """Сколько ударов игрок нанёс боссу сегодня (UTC). Для daily-квеста dq_wb_hit1."""
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) AS c FROM world_boss_hits "
            "WHERE user_id=? AND created_at >= ?",
            (int(user_id), today + " 00:00:00"),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["c"]) if row else 0

    def get_wb_all_participants_damage(self, spawn_id: int) -> List[Dict[str, Any]]:
        """Все участники рейда с их суммарным уроном (для расчёта наград по вкладу)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, SUM(damage) AS total_damage "
            "FROM world_boss_hits WHERE spawn_id=? "
            "GROUP BY user_id",
            (int(spawn_id),),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def wb_try_record_hit(
        self, spawn_id: int, user_id: int, now_ms: int, cooldown_ms: int
    ) -> bool:
        """Атомарный кулдаун 300 мс: UPDATE проходит только если прошло cooldown_ms.

        Возвращает True если удар разрешён (и last_hit_ms обновлён на now_ms),
        False если ещё не прошёл кулдаун.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_player_state SET last_hit_ms=? "
            "WHERE spawn_id=? AND user_id=? "
            "AND (last_hit_ms = 0 OR last_hit_ms <= ?)",
            (int(now_ms), int(spawn_id), int(user_id), int(now_ms - cooldown_ms)),
        )
        ok = cur.rowcount > 0
        conn.commit()
        conn.close()
        return ok
