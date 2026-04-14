"""Одноразовая миграция: применить бонус экипированного образа к статам."""

from __future__ import annotations

import logging

log = logging.getLogger(__name__)

# In-memory кэш: user_id которые уже мигрированы
_migrated: set = set()


class AvatarsMigrateBonusMixin:
    def ensure_avatar_bonus_applied(self, user_id: int) -> None:
        """Применить бонус аватара к статам.
        Полностью самостоятельный — не зависит от _migrated кэша.
        Безопасно вызывать несколько раз: проверяет флаг в БД."""
        _migrated.discard(user_id)
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Добавить колонку если вдруг не существует
            try:
                cursor.execute(
                    "ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0"
                )
                conn.commit()
            except Exception:
                pass  # Колонка уже есть — OK

            # Читаем актуальное состояние из БД
            cursor.execute(
                "SELECT avatar_bonus_applied, equipped_avatar_id, level, strength, endurance, crit, max_hp, current_hp FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return
            if int(self._row_get(row, "avatar_bonus_applied", 0) or 0):
                _migrated.add(user_id)
                return

            avatar_id = self._row_get(row, "equipped_avatar_id") or "base_neutral"
            level = int(self._row_get(row, "level", 1) or 1)
            bonus = self._effective_avatar_bonus(avatar_id, level)
            d_str = int(bonus.get("strength", 0))
            d_end = int(bonus.get("endurance", 0))
            d_crit = int(bonus.get("crit", 0))
            d_hp = int(bonus.get("hp_flat", 0))

            old_mhp = int(self._row_get(row, "max_hp", 60) or 60)
            old_chp = int(self._row_get(row, "current_hp", old_mhp) or old_mhp)
            new_mhp = old_mhp + d_hp
            new_chp = min(new_mhp, old_chp + d_hp)

            cursor.execute(
                """UPDATE players
                   SET strength = strength + ?,
                       endurance = endurance + ?,
                       crit = crit + ?,
                       max_hp = ?,
                       current_hp = ?,
                       avatar_bonus_applied = 1
                   WHERE user_id = ?""",
                (d_str, d_end, d_crit, new_mhp, new_chp, user_id),
            )
            conn.commit()
            _migrated.add(user_id)
            log.info("avatar bonus applied uid=%s avatar=%s: str+%s end+%s crit+%s hp+%s",
                     user_id, avatar_id, d_str, d_end, d_crit, d_hp)
        except Exception as e:
            log.error("ensure_avatar_bonus_applied FAIL uid=%s: %s", user_id, e, exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
        finally:
            conn.close()

    def _apply_initial_avatar_bonus(self, cursor, user_id: int) -> None:
        """Одноразовое: добавить бонус образа к статам.
        Колонка avatar_bonus_applied создаётся миграцией в sqlite_migrations_part4."""
        if user_id in _migrated:
            return
        try:
            cursor.execute(
                "SELECT avatar_bonus_applied, equipped_avatar_id, level, max_hp, current_hp FROM players WHERE user_id = ?",
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
                # HP считаем в Python — MIN() не работает как скалярная функция в PostgreSQL
                old_mhp = int(self._row_get(row, "max_hp", 60) or 60)
                old_chp = int(self._row_get(row, "current_hp", old_mhp) or old_mhp)
                new_mhp = old_mhp + d_hp
                new_chp = min(new_mhp, old_chp + d_hp)
                cursor.execute(
                    """UPDATE players
                       SET strength = strength + ?,
                           endurance = endurance + ?,
                           crit = crit + ?,
                           max_hp = ?,
                           current_hp = ?,
                           avatar_bonus_applied = 1
                       WHERE user_id = ?""",
                    (d_str, d_end, d_crit, new_mhp, new_chp, user_id),
                )
            else:
                cursor.execute(
                    "UPDATE players SET avatar_bonus_applied = 1 WHERE user_id = ?",
                    (user_id,),
                )
            _migrated.add(user_id)
            log.info("avatar bonus applied uid=%s: str+%s end+%s crit+%s hp+%s", user_id, d_str, d_end, d_crit, d_hp)
        except Exception as e:
            log.warning("avatar bonus migration FAIL uid=%s: %s", user_id, e, exc_info=True)
            _migrated.add(user_id)
