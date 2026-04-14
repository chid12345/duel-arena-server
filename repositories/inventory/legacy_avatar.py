"""Переход аватара → base_neutral перед операциями с классами."""

from config import PLAYER_START_CRIT, PLAYER_START_ENDURANCE, PLAYER_START_STRENGTH


class InventoryLegacyAvatarMixin:
    def _remove_legacy_avatar_bonus_with_cursor(self, cursor, user_id: int) -> None:
        """Переключает аватар на base_neutral: вычисляет дельту old→neutral и применяет."""
        cursor.execute(
            "SELECT level, strength, endurance, crit, max_hp, current_hp, equipped_avatar_id "
            "FROM players WHERE user_id = ?",
            (user_id,),
        )
        p = cursor.fetchone()
        if not p:
            return

        avatar_id = (self._row_get(p, "equipped_avatar_id") or "base_neutral").strip()
        if avatar_id in {"", "base_neutral"}:
            return

        level = int(self._row_get(p, "level", 1) or 1)
        old_av = self._effective_avatar_bonus(avatar_id, level)
        new_av = self._effective_avatar_bonus("base_neutral", level)

        d_str = int(new_av.get("strength", 0)) - int(old_av.get("strength", 0))
        d_end = int(new_av.get("endurance", 0)) - int(old_av.get("endurance", 0))
        d_crit = int(new_av.get("crit", 0)) - int(old_av.get("crit", 0))
        d_hp = int(new_av.get("hp_flat", 0)) - int(old_av.get("hp_flat", 0))

        new_max_hp = max(1, int(p["max_hp"]) + d_hp)
        new_current_hp = min(new_max_hp, max(1, int(p["current_hp"]) + d_hp))

        cursor.execute(
            """UPDATE players
               SET strength = ?, endurance = ?, crit = ?,
                   max_hp = ?, current_hp = ?, equipped_avatar_id = 'base_neutral'
               WHERE user_id = ?""",
            (
                max(PLAYER_START_STRENGTH, int(p["strength"]) + d_str),
                max(PLAYER_START_ENDURANCE, int(p["endurance"]) + d_end),
                max(PLAYER_START_CRIT, int(p["crit"]) + d_crit),
                new_max_hp,
                new_current_hp,
                user_id,
            ),
        )
