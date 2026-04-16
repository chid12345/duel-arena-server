"""Сохранение записи боя + скользящее окно (keep last N per player)."""

from __future__ import annotations

import json
import logging
from typing import Dict

logger = logging.getLogger(__name__)

# Сколько последних боёв храним на каждого игрока (реальных, не ботов).
# Старше — удаляются при каждом новом save_battle.
BATTLE_HISTORY_KEEP = 20


class BattlesSaveMixin:
    def save_battle(self, battle_data: Dict) -> int:
        conn = self.get_connection()
        cursor = conn.cursor()
        # JSON — безопасно читается обратно; старые str(dict)-записи будут просто невидимы для реплея.
        details_json = json.dumps(battle_data["details"], ensure_ascii=False, default=str)
        params = (
            battle_data["player1_id"],
            battle_data["player2_id"],
            battle_data["is_bot1"],
            battle_data["is_bot2"],
            battle_data["winner_id"],
            battle_data["result"],
            battle_data["rounds"],
            details_json,
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

        # Скользящее окно: оставить последние BATTLE_HISTORY_KEEP боёв у каждого реального игрока.
        # Только для реальных user_id (ботов не трогаем — у них is_botX=1, чистка не важна).
        for uid_key, is_bot_key in (("player1_id", "is_bot1"), ("player2_id", "is_bot2")):
            if battle_data.get(is_bot_key):
                continue
            uid = battle_data.get(uid_key)
            if not uid:
                continue
            try:
                self._trim_player_battles(cursor, int(uid), BATTLE_HISTORY_KEEP)
            except Exception as e:
                logger.warning("battle history trim failed for uid=%s: %s", uid, e)

        conn.commit()
        conn.close()
        return battle_id

    def _trim_player_battles(self, cursor, user_id: int, keep: int) -> None:
        """Удалить у игрока все бои, кроме последних `keep`.

        Бой считается принадлежащим игроку, если он player1 ИЛИ player2.
        Если бой удаляется, он удаляется полностью (для обоих участников).
        Это ок: если один из участников наиграл 20+ боёв, старая запись всё равно
        уже показана не будет — у обоих 20 последних. Редкие артефакты у второго
        игрока игнорируем ради простоты.
        """
        ph = "%s" if self._pg else "?"
        # Находим battle_id, которые надо удалить — старше чем топ-keep.
        sql_find = (
            f"SELECT battle_id FROM battles "
            f"WHERE player1_id = {ph} OR player2_id = {ph} "
            f"ORDER BY created_at DESC, battle_id DESC "
            f"OFFSET {int(keep)}"
            if self._pg
            else
            f"SELECT battle_id FROM battles "
            f"WHERE player1_id = {ph} OR player2_id = {ph} "
            f"ORDER BY created_at DESC, battle_id DESC "
            f"LIMIT -1 OFFSET {int(keep)}"
        )
        cursor.execute(sql_find, (user_id, user_id))
        rows = cursor.fetchall() or []
        ids = [int(r["battle_id"] if isinstance(r, dict) or hasattr(r, "keys") else r[0]) for r in rows]
        if not ids:
            return
        # Удаляем пачкой
        placeholders = ",".join([ph] * len(ids))
        cursor.execute(f"DELETE FROM battles WHERE battle_id IN ({placeholders})", tuple(ids))
