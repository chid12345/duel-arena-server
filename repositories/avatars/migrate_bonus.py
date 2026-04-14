"""Одноразовая миграция: применить бонус экипированного образа к статам."""

from __future__ import annotations

import logging

log = logging.getLogger(__name__)


class AvatarsMigrateBonusMixin:
    def _apply_initial_avatar_bonus(self, cursor, user_id: int) -> None:
        """Одноразовое: добавить бонус экипированного образа к статам.
        Использует ОТДЕЛЬНОЕ соединение чтобы не ломать основной cursor."""
        conn2 = None
        try:
            conn2 = self.get_connection()
            c2 = conn2.cursor()

            # Проверка/добавление колонки
            is_pg = bool(getattr(self, "_pg", False))
            has_col = False
            if is_pg:
                c2.execute(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name='players' AND column_name='avatar_bonus_applied' LIMIT 1"
                )
                has_col = bool(c2.fetchone())
            else:
                c2.execute("PRAGMA table_info(players)")
                has_col = "avatar_bonus_applied" in {r[1] for r in c2.fetchall()}

            if not has_col:
                c2.execute("ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0")
                conn2.commit()

            # Проверка флага
            c2.execute(
                "SELECT avatar_bonus_applied, equipped_avatar_id, level FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = c2.fetchone()
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
                c2.execute(
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
                c2.execute(
                    "UPDATE players SET avatar_bonus_applied = 1 WHERE user_id = ?",
                    (user_id,),
                )
            conn2.commit()
        except Exception as e:
            log.warning("avatar bonus migration skip: %s", e)
            if conn2:
                try:
                    conn2.rollback()
                except Exception:
                    pass
        finally:
            if conn2:
                try:
                    conn2.close()
                except Exception:
                    pass
