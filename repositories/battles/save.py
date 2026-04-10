"""Сохранение записи боя."""

from __future__ import annotations

from typing import Dict


class BattlesSaveMixin:
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
