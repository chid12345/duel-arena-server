"""Mixin: переходы статусов рейда (start/finish) + идемпотентные флаги
(announced_5min / reminders_sent_5min) + счётчик онлайна для балансировки HP.

Чтение строк world_boss_spawns — в `spawns.py` (Закон 1).
"""
from __future__ import annotations

import logging
from typing import Optional

log = logging.getLogger(__name__)


class WorldBossSpawnsLifecycleMixin:

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

    def wb_try_mark_announced_5min(self, spawn_id: int) -> bool:
        """Атомарно ставит announced_5min=1. True только если поставили мы (анти-дубль)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_spawns SET announced_5min=1 "
            "WHERE spawn_id=? AND (announced_5min IS NULL OR announced_5min=0)",
            (int(spawn_id),),
        )
        ok = cur.rowcount > 0
        conn.commit()
        conn.close()
        return ok

    def wb_try_mark_reminders_sent_5min(self, spawn_id: int) -> bool:
        """Атомарно ставит reminders_sent_5min=1. True только если поставили мы (анти-дубль)."""
        conn = self.get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE world_boss_spawns SET reminders_sent_5min=1 "
            "WHERE spawn_id=? AND (reminders_sent_5min IS NULL OR reminders_sent_5min=0)",
            (int(spawn_id),),
        )
        ok = cur.rowcount > 0
        conn.commit()
        conn.close()
        return ok
