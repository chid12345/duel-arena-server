"""Mixin: рейды мирового босса — чтение/CRUD строк world_boss_spawns.

Переходы статусов (start/finish) и идемпотентные флаги напоминаний —
в соседнем модуле `spawns_lifecycle.py` (Закон 1).
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

log = logging.getLogger(__name__)


class WorldBossSpawnsMixin:

    def create_wb_spawn(
        self,
        scheduled_at: str,
        boss_name: str,
        stat_profile: Dict[str, float],
        max_hp: int,
        boss_type: str = "universal",
    ) -> int:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO world_boss_spawns
                  (boss_name, boss_type, max_hp, current_hp, stat_profile,
                   status, scheduled_at)
               VALUES (?,?,?,?,?,?,?)""",
            (boss_name, boss_type, int(max_hp), int(max_hp),
             json.dumps(stat_profile), "scheduled", scheduled_at),
        )
        conn.commit()
        spawn_id = cur.lastrowid
        conn.close()
        return int(spawn_id)

    def get_wb_active_spawn(self) -> Optional[Dict[str, Any]]:
        """Активный рейд (status='active'), если есть."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_spawns WHERE status='active' ORDER BY spawn_id DESC LIMIT 1"
        )
        row = cur.fetchone()
        conn.close()
        return self._wb_spawn_row_to_dict(row) if row else None

    def get_wb_next_scheduled(self) -> Optional[Dict[str, Any]]:
        """Ближайший запланированный рейд (status='scheduled')."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_spawns WHERE status='scheduled' "
            "ORDER BY scheduled_at ASC LIMIT 1"
        )
        row = cur.fetchone()
        conn.close()
        return self._wb_spawn_row_to_dict(row) if row else None

    def get_wb_last_finished(self) -> Optional[Dict[str, Any]]:
        """Последний завершённый рейд (won/lost) — для показа «Прошлый рейд»."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_spawns "
            "WHERE status IN ('won','lost') ORDER BY spawn_id DESC LIMIT 1"
        )
        row = cur.fetchone()
        conn.close()
        return self._wb_spawn_row_to_dict(row) if row else None

    def get_wb_recent_finished_with_user(self, user_id: int, limit: int = 5) -> list:
        """Последние N завершённых рейдов + LEFT JOIN с наградой игрока.
        Если игрок не участвовал в рейде — contribution_pct=0, gold/exp/diamonds=0.
        Используется на вкладке «Ожидание» для истории последних рейдов.
        """
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT s.spawn_id, s.boss_name, s.boss_type, s.status, s.ended_at, "
            "       COALESCE(r.contribution_pct, 0) AS contribution_pct, "
            "       COALESCE(r.gold, 0) AS gold, "
            "       COALESCE(r.exp, 0) AS exp, "
            "       COALESCE(r.diamonds, 0) AS diamonds, "
            "       r.chest_type AS chest_type "
            "FROM world_boss_spawns s "
            "LEFT JOIN world_boss_rewards r ON r.spawn_id = s.spawn_id AND r.user_id = ? "
            "WHERE s.status IN ('won','lost') "
            "ORDER BY s.spawn_id DESC LIMIT ?",
            (int(user_id), int(limit)),
        )
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_wb_spawn(self, spawn_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_spawns WHERE spawn_id=?", (int(spawn_id),)
        )
        row = cur.fetchone()
        conn.close()
        return self._wb_spawn_row_to_dict(row) if row else None

    def get_wb_active_or_expired(self) -> Optional[Dict[str, Any]]:
        """Активный рейд, если он есть и ещё не истёк по времени.
        Возвращает dict с полем is_expired=True если пора закрывать.
        """
        row = self.get_wb_active_spawn()
        if not row:
            return None
        return row

    @staticmethod
    def _wb_spawn_row_to_dict(row: Any) -> Dict[str, Any]:
        d = dict(row)
        raw = d.get("stat_profile") or "{}"
        try:
            d["stat_profile"] = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            d["stat_profile"] = {}
        return d
