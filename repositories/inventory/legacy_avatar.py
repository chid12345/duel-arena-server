"""Снятие бонуса старого каталога аватаров перед операциями с классами."""


class InventoryLegacyAvatarMixin:
    def _remove_legacy_avatar_bonus_with_cursor(self, cursor, user_id: int) -> None:
        """Снимает бонус старого avatar-catalog, чтобы не наслаивался на новую систему классов."""
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
        av = self._effective_avatar_bonus(avatar_id, level)
        d_str = int(av.get("strength", 0) or 0)
        d_end = int(av.get("endurance", 0) or 0)
        d_crit = int(av.get("crit", 0) or 0)
        d_hp = int(av.get("hp_flat", 0) or 0)
        new_max_hp = max(1, int(p["max_hp"]) - d_hp)
        new_current_hp = min(new_max_hp, max(1, int(p["current_hp"]) - d_hp))

        cursor.execute(
            """UPDATE players
               SET strength = ?, endurance = ?, crit = ?,
                   max_hp = ?, current_hp = ?, equipped_avatar_id = 'base_neutral'
               WHERE user_id = ?""",
            (
                max(1, int(p["strength"]) - d_str),
                max(1, int(p["endurance"]) - d_end),
                max(1, int(p["crit"]) - d_crit),
                new_max_hp,
                new_current_hp,
                user_id,
            ),
        )
