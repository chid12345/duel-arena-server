"""Улучшения (attack_power, dodge, …)."""

from __future__ import annotations

from typing import Dict

from config import IMPROVEMENT_COST_MULTIPLIER, IMPROVEMENT_LEVELS


class UsersImprovementsMixin:
    def get_player_improvements(self, user_id: int) -> Dict:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT improvement_type, level FROM improvements WHERE user_id = ?",
            (user_id,),
        )
        improvements = {row["improvement_type"]: row["level"] for row in cursor.fetchall()}
        conn.close()
        return improvements

    def upgrade_improvement(self, user_id: int, improvement_type: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT level FROM improvements WHERE user_id = ? AND improvement_type = ?",
            (user_id, improvement_type),
        )
        result = cursor.fetchone()
        if not result or result["level"] >= IMPROVEMENT_LEVELS:
            conn.close()
            return False
        new_level = result["level"] + 1
        cost = self._get_improvement_cost(improvement_type, new_level)
        cursor.execute("SELECT gold AS gold FROM players WHERE user_id = ?", (user_id,))
        player_gold = cursor.fetchone()["gold"]
        if player_gold < cost:
            conn.close()
            return False
        cursor.execute(
            "UPDATE improvements SET level = ? WHERE user_id = ? AND improvement_type = ?",
            (new_level, user_id, improvement_type),
        )
        cursor.execute("UPDATE players SET gold = gold - ? WHERE user_id = ?", (cost, user_id))
        conn.commit()
        conn.close()
        return True

    def _get_improvement_cost(self, improvement_type: str, level: int) -> int:
        base_costs = {
            "attack_power": 2000,
            "dodge": 3000,
            "block_mastery": 2500,
            "critical_strike": 4000,
        }
        base_cost = base_costs.get(improvement_type, 1000)
        return int(base_cost * (IMPROVEMENT_COST_MULTIPLIER ** (level - 1)))
