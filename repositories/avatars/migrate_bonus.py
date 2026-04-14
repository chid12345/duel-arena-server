"""Одноразовая миграция: применить бонус экипированного образа к статам."""

from __future__ import annotations


class AvatarsMigrateBonusMixin:
    def _ensure_avatar_bonus_col(self, cursor) -> None:
        """Добавить колонку avatar_bonus_applied если нет."""
        is_pg = bool(getattr(self, "_pg", False))
        if is_pg:
            cursor.execute(
                """SELECT 1 FROM information_schema.columns
                   WHERE table_name='players' AND column_name='avatar_bonus_applied' LIMIT 1"""
            )
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0")
        else:
            cursor.execute("PRAGMA table_info(players)")
            cols = {r[1] for r in cursor.fetchall()}
            if "avatar_bonus_applied" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0")

    def _apply_initial_avatar_bonus(self, cursor, user_id: int) -> None:
        """Одноразовое: добавить бонус экипированного образа к статам."""
        self._ensure_avatar_bonus_col(cursor)
        cursor.execute(
            "SELECT avatar_bonus_applied, equipped_avatar_id, level FROM players WHERE user_id = ?",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return
        applied = int(self._row_get(row, "avatar_bonus_applied", 0) or 0)
        if applied:
            return
        avatar_id = self._row_get(row, "equipped_avatar_id") or "base_neutral"
        level = int(self._row_get(row, "level", 1) or 1)
        bonus = self._effective_avatar_bonus(avatar_id, level)
        d_str = int(bonus.get("strength", 0))
        d_end = int(bonus.get("endurance", 0))
        d_crit = int(bonus.get("crit", 0))
        d_hp = int(bonus.get("hp_flat", 0))
        if d_str or d_end or d_crit or d_hp:
            cursor.execute(
                """UPDATE players
                   SET strength = strength + ?,
                       endurance = endurance + ?,
                       crit = crit + ?,
                       max_hp = max_hp + ?,
                       current_hp = MIN(max_hp + ?, current_hp + ?),
                       avatar_bonus_applied = 1
                   WHERE user_id = ?""",
                (d_str, d_end, d_crit, d_hp, d_hp, d_hp, user_id),
            )
        else:
            cursor.execute(
                "UPDATE players SET avatar_bonus_applied = 1 WHERE user_id = ?",
                (user_id,),
            )
