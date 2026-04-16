"""Push-уведомление: HP полностью восстановлен."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List

from config import (
    HP_REGEN_BASE_SECONDS,
    HP_REGEN_ENDURANCE_BONUS,
    PLAYER_START_MAX_HP,
)
from config.battle_constants import stamina_stats_invested


class UsersHpNotifyMixin:
    def get_players_hp_notify_pending(self, limit: int = 200) -> List[Dict]:
        """Игроки, которым нужно отправить push когда HP станет полным."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT user_id, chat_id, current_hp, max_hp, level,
                          last_hp_regen
                   FROM players
                   WHERE hp_full_notified = 0
                     AND chat_id IS NOT NULL
                     AND current_hp < max_hp
                   LIMIT ?""",
                (limit,),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def mark_hp_full_notified(self, user_ids: List[int]) -> None:
        """Пометить что push отправлен."""
        if not user_ids:
            return
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            placeholders = ",".join("?" * len(user_ids))
            cursor.execute(
                f"UPDATE players SET hp_full_notified = 1 WHERE user_id IN ({placeholders})",
                user_ids,
            )
            conn.commit()
        finally:
            conn.close()

    def reset_hp_notify_flag(self, user_id: int) -> None:
        """Сбросить флаг — HP упал, нужно будет уведомить при восстановлении."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE players SET hp_full_notified = 0 WHERE user_id = ? AND hp_full_notified = 1",
                (user_id,),
            )
            conn.commit()
        finally:
            conn.close()

    @staticmethod
    def is_hp_full_now(player: Dict) -> bool:
        """Проверить: HP должен быть полным по времени?"""
        max_hp = int(player.get("max_hp") or PLAYER_START_MAX_HP)
        current_hp = max_hp if player.get("current_hp") is None else int(player["current_hp"])
        if current_hp >= max_hp:
            return True
        last_regen_str = player.get("last_hp_regen")
        if not last_regen_str:
            return False
        try:
            last_regen = datetime.fromisoformat(
                str(last_regen_str).split("+")[0].split(".")[0]
            )
        except (ValueError, AttributeError):
            return False
        elapsed = max(0.0, (datetime.utcnow() - last_regen).total_seconds())
        endurance_inv = stamina_stats_invested(max_hp, int(player.get("level", 1)))
        mult = 1.0 + max(0, endurance_inv) * HP_REGEN_ENDURANCE_BONUS
        gained = int(elapsed * (max_hp / HP_REGEN_BASE_SECONDS * mult))
        return (current_hp + gained) >= max_hp
