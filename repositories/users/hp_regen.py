"""Ленивый реген HP."""

from __future__ import annotations

from datetime import datetime
from typing import Dict

from config import HP_REGEN_BASE_SECONDS, HP_REGEN_ENDURANCE_BONUS, PLAYER_START_MAX_HP


class UsersHpRegenMixin:
    def apply_hp_regen(self, user_id: int, endurance_invested: int) -> Dict:
        """Ленивый реген HP по таймеру — вызывать при каждом действии игрока."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT max_hp, current_hp, last_hp_regen FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {}
            max_hp = int(row["max_hp"] or PLAYER_START_MAX_HP)
            current_hp = max_hp if row["current_hp"] is None else int(row["current_hp"])
            current_hp = min(current_hp, max_hp)  # clamp: buff HP не сохраняется
            now = datetime.utcnow()
            if current_hp < max_hp:
                last_regen_str = row["last_hp_regen"]
                try:
                    last_regen = datetime.fromisoformat(last_regen_str) if last_regen_str else now
                except ValueError:
                    last_regen = now
                elapsed = max(0.0, (now - last_regen).total_seconds())
                mult = 1.0 + max(0, int(endurance_invested)) * HP_REGEN_ENDURANCE_BONUS
                gained = int(elapsed * (max_hp / HP_REGEN_BASE_SECONDS * mult))
                current_hp = min(max_hp, current_hp + gained)
            cursor.execute(
                "UPDATE players SET current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
                (current_hp, now.isoformat(), user_id),
            )
            conn.commit()
            return {"current_hp": current_hp, "max_hp": max_hp}
        finally:
            conn.close()

    def apply_hp_regen_from_player(self, player: Dict, endurance_invested: int) -> Dict:
        """Быстрая версия: принимает уже загруженный dict игрока, экономит 1 SELECT."""
        user_id = player.get("user_id")
        if not user_id:
            return {}
        max_hp = int(player.get("max_hp") or PLAYER_START_MAX_HP)
        current_hp = max_hp if player.get("current_hp") is None else int(player["current_hp"])
        current_hp = min(current_hp, max_hp)  # clamp: buff HP не сохраняется
        last_regen_str = player.get("last_hp_regen")
        now = datetime.utcnow()
        if current_hp < max_hp:
            try:
                last_regen = datetime.fromisoformat(
                    str(last_regen_str).split("+")[0].split(".")[0]
                ) if last_regen_str else now
            except (ValueError, AttributeError):
                last_regen = now
            elapsed = max(0.0, (now - last_regen).total_seconds())
            mult = 1.0 + max(0, int(endurance_invested)) * HP_REGEN_ENDURANCE_BONUS
            gained = int(elapsed * (max_hp / HP_REGEN_BASE_SECONDS * mult))
            current_hp = min(max_hp, current_hp + gained)
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE players SET current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
                (current_hp, now.isoformat(), user_id),
            )
            conn.commit()
        finally:
            conn.close()
        return {"current_hp": current_hp, "max_hp": max_hp}
