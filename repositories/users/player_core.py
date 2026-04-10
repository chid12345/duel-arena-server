"""Создание игрока, обновление статов, начальные улучшения."""

from __future__ import annotations

from datetime import datetime
from typing import Dict

from config import (
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
    PLAYER_START_LEVEL,
    PLAYER_START_MAX_HP,
    PLAYER_START_STRENGTH,
    gold_when_reaching_level,
)


class UsersPlayerCoreMixin:
    def get_or_create_player(self, user_id: int, username: str) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM players WHERE user_id = ?", (user_id,))
        player = cursor.fetchone()
        if not player:
            _g1 = gold_when_reaching_level(1)
            start_max_hp = PLAYER_START_MAX_HP
            cursor.execute(
                """INSERT INTO players
                   (user_id, username, level, exp, strength, endurance, crit, max_hp, current_hp,
                    free_stats, gold, exp_milestones)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id, username, PLAYER_START_LEVEL, 0,
                    PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE, PLAYER_START_CRIT,
                    start_max_hp, start_max_hp, PLAYER_START_FREE_STATS, _g1, 0,
                ),
            )
            self._init_player_improvements_with_cursor(cursor, user_id)
            conn.commit()
            cursor.execute("SELECT * FROM players WHERE user_id = ?", (user_id,))
            player = cursor.fetchone()
        conn.close()
        return dict(player)

    def _init_player_improvements_with_cursor(self, cursor, user_id: int):
        for imp_type in ("attack_power", "dodge", "block_mastery", "critical_strike"):
            cursor.execute(
                "INSERT OR IGNORE INTO improvements (user_id, improvement_type, level) VALUES (?, ?, 0)",
                (user_id, imp_type),
            )

    def update_player_stats(self, user_id: int, stats_update: Dict):
        """При смене current_hp — сбрасываем last_hp_regen (точка отсчёта регена)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        set_clauses = []
        values = []
        for key, value in stats_update.items():
            set_clauses.append(f"{key} = ?")
            values.append(value)
        if "current_hp" in stats_update:
            set_clauses.append("last_hp_regen = ?")
            values.append(datetime.utcnow().isoformat())
        values.append(user_id)
        cursor.execute(
            f"UPDATE players SET {', '.join(set_clauses)}, last_active = CURRENT_TIMESTAMP WHERE user_id = ?",
            values,
        )
        conn.commit()
        conn.close()
