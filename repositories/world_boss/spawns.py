"""Mixin: рейды мирового босса — world_boss_spawns (CRUD + атомарный урон)."""
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

    def get_wb_spawn(self, spawn_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM world_boss_spawns WHERE spawn_id=?", (int(spawn_id),)
        )
        row = cur.fetchone()
        conn.close()
        return self._wb_spawn_row_to_dict(row) if row else None

    def start_wb_spawn(
        self, spawn_id: int, online_at_start: int, max_hp: int
    ) -> None:
        """Переводит scheduled→active и пересчитывает HP под реальный онлайн."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_spawns "
            "SET status='active', started_at=CURRENT_TIMESTAMP, "
            "online_at_start=?, max_hp=?, current_hp=? "
            "WHERE spawn_id=? AND status='scheduled'",
            (int(online_at_start), int(max_hp), int(max_hp), int(spawn_id)),
        )
        conn.commit()
        conn.close()

    def wb_count_online_players(self, window_minutes: int = 10) -> int:
        """Онлайн = количество игроков с last_active за последние N минут."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) AS c FROM players "
            "WHERE last_active >= datetime('now', ?)",
            (f"-{int(window_minutes)} minutes",),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["c"]) if row else 0

    def get_wb_active_or_expired(self) -> Optional[Dict[str, Any]]:
        """Активный рейд, если он есть и ещё не истёк по времени.
        Возвращает dict с полем is_expired=True если пора закрывать.
        """
        row = self.get_wb_active_spawn()
        if not row:
            return None
        return row

    def finish_wb_spawn(
        self,
        spawn_id: int,
        is_victory: bool,
        participants: int,
        last_hit_uid: Optional[int],
        top_damage_uid: Optional[int],
    ) -> None:
        """Закрывает рейд: ставит статус won/lost и фиксирует победителей сундуков."""
        status = "won" if is_victory else "lost"
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_spawns SET status=?, ended_at=CURRENT_TIMESTAMP, "
            "total_participants=?, winner_last_hit_uid=?, winner_top_damage_uid=? "
            "WHERE spawn_id=?",
            (status, int(participants),
             int(last_hit_uid) if last_hit_uid else None,
             int(top_damage_uid) if top_damage_uid else None,
             int(spawn_id)),
        )
        conn.commit()
        conn.close()

    def apply_damage_to_boss(self, spawn_id: int, damage: int) -> Optional[int]:
        """Атомарно вычитает damage из current_hp.
        Возвращает новое значение HP, либо None если рейд уже не активен.
        Обрезает current_hp до 0 (не уходит в минус) — нужно для корректного last-hit.
        """
        if damage <= 0:
            return None
        conn = self.get_connection()
        cur = conn.cursor()
        # Атомарный UPDATE — current_hp не уйдёт ниже 0.
        cur.execute(
            "UPDATE world_boss_spawns "
            "SET current_hp = MAX(0, current_hp - ?) "
            "WHERE spawn_id=? AND status='active' AND current_hp > 0",
            (int(damage), int(spawn_id)),
        )
        conn.commit()
        cur.execute(
            "SELECT current_hp FROM world_boss_spawns WHERE spawn_id=?",
            (int(spawn_id),),
        )
        row = cur.fetchone()
        conn.close()
        return int(row["current_hp"]) if row else None

    @staticmethod
    def _wb_spawn_row_to_dict(row: Any) -> Dict[str, Any]:
        d = dict(row)
        raw = d.get("stat_profile") or "{}"
        try:
            d["stat_profile"] = json.loads(raw) if isinstance(raw, str) else raw
        except Exception:
            d["stat_profile"] = {}
        return d
