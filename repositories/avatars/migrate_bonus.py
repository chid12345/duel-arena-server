"""Одноразовая миграция: применить бонус экипированного образа к статам."""

from __future__ import annotations

import logging

log = logging.getLogger(__name__)

# In-memory кэш: user_id которые уже мигрированы (не открываем лишнее соединение)
_migrated: set = set()
# Флаг: колонка уже точно есть в БД
_col_ready = False


class AvatarsMigrateBonusMixin:
    def _apply_initial_avatar_bonus(self, cursor, user_id: int) -> None:
        """Одноразовое: добавить бонус образа. Быстрый выход если уже было."""
        global _col_ready
        if user_id in _migrated:
            return

        conn2 = None
        try:
            # Быстрая проверка через основной cursor (без нового соединения)
            if _col_ready:
                cursor.execute(
                    "SELECT avatar_bonus_applied FROM players WHERE user_id = ?",
                    (user_id,),
                )
                row = cursor.fetchone()
                if row and int(self._row_get(row, "avatar_bonus_applied", 0) or 0):
                    _migrated.add(user_id)
                    return
            else:
                # Проверим есть ли колонка
                try:
                    cursor.execute(
                        "SELECT avatar_bonus_applied FROM players WHERE user_id = ? LIMIT 1",
                        (user_id,),
                    )
                    row = cursor.fetchone()
                    _col_ready = True
                    if row and int(self._row_get(row, "avatar_bonus_applied", 0) or 0):
                        _migrated.add(user_id)
                        return
                except Exception:
                    pass  # колонки нет — нужна миграция

            # Нужна миграция — открываем отдельное соединение
            conn2 = self.get_connection()
            c2 = conn2.cursor()

            if not _col_ready:
                is_pg = bool(getattr(self, "_pg", False))
                if is_pg:
                    c2.execute(
                        "SELECT 1 FROM information_schema.columns "
                        "WHERE table_name='players' AND column_name='avatar_bonus_applied' LIMIT 1"
                    )
                    if not c2.fetchone():
                        c2.execute("ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0")
                        conn2.commit()
                else:
                    c2.execute("PRAGMA table_info(players)")
                    if "avatar_bonus_applied" not in {r[1] for r in c2.fetchall()}:
                        c2.execute("ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0")
                        conn2.commit()
                _col_ready = True

            c2.execute(
                "SELECT avatar_bonus_applied, equipped_avatar_id, level FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = c2.fetchone()
            if not row or int(self._row_get(row, "avatar_bonus_applied", 0) or 0):
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
            _migrated.add(user_id)
            log.info("avatar bonus applied uid=%s: +%s/+%s/+%s/+%s", user_id, d_str, d_end, d_crit, d_hp)
        except Exception as e:
            log.warning("avatar bonus migration skip uid=%s: %s", user_id, e)
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
