"""Одноразовая миграция: применить бонус экипированного образа к статам."""

from __future__ import annotations

import logging

log = logging.getLogger(__name__)

# In-memory кэш: user_id которые уже мигрированы
_migrated: set = set()


class AvatarsMigrateBonusMixin:
    def ensure_avatar_bonus_applied(self, user_id: int) -> None:
        """Публичный метод: применить бонус аватара — ВСЕГДА проверяет по БД,
        игнорирует in-memory кэш (resync мог сбросить флаг)."""
        _migrated.discard(user_id)  # сбросить кэш, чтобы _apply проверил БД
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            self._apply_initial_avatar_bonus(cursor, user_id)
            conn.commit()
        finally:
            conn.close()

    def _apply_initial_avatar_bonus(self, cursor, user_id: int) -> None:
        """Одноразовое: добавить бонус образа к статам.
        Колонка avatar_bonus_applied создаётся миграцией в sqlite_migrations_part4."""
        if user_id in _migrated:
            return
        try:
            cursor.execute(
                "SELECT avatar_bonus_applied, equipped_avatar_id, level FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return
            applied = int(self._row_get(row, "avatar_bonus_applied", 0) or 0)
            if applied:
                _migrated.add(user_id)
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
            _migrated.add(user_id)
        except Exception as e:
            log.warning("avatar bonus migration skip uid=%s: %s", user_id, e)
            _migrated.add(user_id)  # не пробовать повторно
