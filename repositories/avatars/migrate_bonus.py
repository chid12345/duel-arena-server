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
            # Добавить колонку если вдруг не существует.
            # ВАЖНО: в PostgreSQL упавший ALTER TABLE переводит транзакцию в ABORTED-состояние,
            # поэтому при ошибке нужен rollback — иначе последующий SELECT тоже упадёт.
            try:
                cursor.execute(
                    "ALTER TABLE players ADD COLUMN avatar_bonus_applied INTEGER DEFAULT 0"
                )
                conn.commit()
            except Exception:
                try:
                    conn.rollback()
                except Exception:
                    pass  # Колонка уже есть — транзакция сброшена, продолжаем

            # Читаем актуальное состояние из БД
            cursor.execute(
                "SELECT avatar_bonus_applied, equipped_avatar_id, level, avatar_bonus_level, strength, endurance, crit, max_hp, current_hp FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return
            if int(self._row_get(row, "avatar_bonus_applied", 0) or 0):
                # База уже применена — досчитываем масштаб (+1 за 20 ур.) до
                # текущего уровня. Раньше масштаб запекался один раз при
                # экипировке и при прокачке в бой не доезжал (этап 7 аудита).
                self._resync_avatar_scale_cursor(cursor, user_id, row=row)
                conn.commit()
                _migrated.add(user_id)
                return

            avatar_id = self._row_get(row, "equipped_avatar_id") or "base_neutral"
            level = int(self._row_get(row, "level", 1) or 1)
            bonus = self._effective_avatar_bonus(avatar_id, level)
            d_str = int(bonus.get("strength", 0))
            d_end = int(bonus.get("endurance", 0))
            d_crit = int(bonus.get("crit", 0))
            d_hp = int(bonus.get("hp_flat", 0))

            _raw_mhp = self._row_get(row, "max_hp", 60)
            old_mhp = int(60 if _raw_mhp is None else _raw_mhp)
            _raw_chp = self._row_get(row, "current_hp", old_mhp)
            old_chp = old_mhp if _raw_chp is None else int(_raw_chp)
            new_mhp = old_mhp + d_hp
            new_chp = min(new_mhp, old_chp + d_hp)

            cursor.execute(
                """UPDATE players
                   SET strength = strength + ?,
                       endurance = endurance + ?,
                       crit = crit + ?,
                       max_hp = ?,
                       current_hp = ?,
                       avatar_bonus_applied = 1,
                       avatar_bonus_level = ?
                   WHERE user_id = ?""",
                (d_str, d_end, d_crit, new_mhp, new_chp, level, user_id),
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

    def _resync_avatar_scale_cursor(self, cursor, user_id: int, *, row=None) -> bool:
        """Досчитать масштаб бонуса аватара (+1 за 20 ур., макс +3) до текущего
        уровня. Работает по дельте: сравнивает scale(текущий ур.) и
        scale(уровень, на котором масштаб запечён = avatar_bonus_level), и
        добавляет разницу к str/end/crit. База аватара сокращается в дельте,
        остаётся только масштаб (hp_flat не масштабируется).

        Если avatar_bonus_level не задан (0/None) — инициализируем его текущим
        уровнем без изменения статов (считаем, что запечённый масштаб уже
        соответствует текущему — безопасно, без задвоения)."""
        if row is None:
            cursor.execute(
                "SELECT equipped_avatar_id, level, avatar_bonus_level FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return False
        level = int(self._row_get(row, "level", 1) or 1)
        applied_lvl = int(self._row_get(row, "avatar_bonus_level", 0) or 0)
        if applied_lvl <= 0:
            cursor.execute(
                "UPDATE players SET avatar_bonus_level = ? WHERE user_id = ?",
                (level, user_id),
            )
            return False
        if applied_lvl == level:
            return False
        avatar_id = self._row_get(row, "equipped_avatar_id") or "base_neutral"
        target = self._effective_avatar_bonus(avatar_id, level)
        prev = self._effective_avatar_bonus(avatar_id, applied_lvl)
        d_str = int(target["strength"]) - int(prev["strength"])
        d_end = int(target["endurance"]) - int(prev["endurance"])
        d_crit = int(target["crit"]) - int(prev["crit"])
        if d_str or d_end or d_crit:
            cursor.execute(
                """UPDATE players
                   SET strength = strength + ?, endurance = endurance + ?,
                       crit = crit + ?, avatar_bonus_level = ?
                   WHERE user_id = ?""",
                (d_str, d_end, d_crit, level, user_id),
            )
            return True
        cursor.execute(
            "UPDATE players SET avatar_bonus_level = ? WHERE user_id = ?",
            (level, user_id),
        )
        return False

    def resync_avatar_scale(self, user_id: int) -> bool:
        """Публичная обёртка: досчитать масштаб бонуса аватара до текущего уровня
        (собственное соединение). Безопасно вызывать часто. Возвращает True,
        если статы изменились (тогда вызывающему стоит сбросить кэш игрока)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            changed = self._resync_avatar_scale_cursor(cursor, user_id)
            conn.commit()
            return bool(changed)
        except Exception as e:
            log.warning("resync_avatar_scale FAIL uid=%s: %s", user_id, e)
            try:
                conn.rollback()
            except Exception:
                pass
            return False
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
                _raw_mhp2 = self._row_get(row, "max_hp", 60)
                old_mhp = int(60 if _raw_mhp2 is None else _raw_mhp2)
                _raw_chp2 = self._row_get(row, "current_hp", old_mhp)
                old_chp = old_mhp if _raw_chp2 is None else int(_raw_chp2)
                new_mhp = old_mhp + d_hp
                new_chp = min(new_mhp, old_chp + d_hp)
                cursor.execute(
                    """UPDATE players
                       SET strength = strength + ?,
                           endurance = endurance + ?,
                           crit = crit + ?,
                           max_hp = ?,
                           current_hp = ?,
                           avatar_bonus_applied = 1,
                           avatar_bonus_level = ?
                       WHERE user_id = ?""",
                    (d_str, d_end, d_crit, new_mhp, new_chp, level, user_id),
                )
            else:
                cursor.execute(
                    "UPDATE players SET avatar_bonus_applied = 1, avatar_bonus_level = ? WHERE user_id = ?",
                    (level, user_id),
                )
            _migrated.add(user_id)
            log.info("avatar bonus applied uid=%s: str+%s end+%s crit+%s hp+%s", user_id, d_str, d_end, d_crit, d_hp)
        except Exception as e:
            log.warning("avatar bonus migration FAIL uid=%s: %s", user_id, e, exc_info=True)
            _migrated.add(user_id)
