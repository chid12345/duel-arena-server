"""Применение сборки и пассивный бонус USDT-образа."""

from __future__ import annotations

from typing import Optional, Tuple

from repositories.inventory.usdt_train import _VALID_PASSIVES, _USDT_CI


class InventoryUsdtApplyPassiveMixin:

    def apply_usdt_stats(self, user_id: int, class_id: str) -> Tuple[bool, str, Optional[dict]]:
        """Сохранить сборку: применить статы к персонажу (если надет), заблокировать редактирование."""
        if not self.has_class(user_id, class_id):
            return False, "USDT-образ не найден", None

        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            if self._get_stats_applied(cursor, user_id, class_id):
                return False, "Сборка уже сохранена", None

            cursor.execute(
                "SELECT free_stats_saved, passive_type FROM user_inventory WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )
            row = cursor.fetchone()
            free = int(self._row_get(row, "free_stats_saved", 0) or 0)
            passive = (self._row_get(row, "passive_type") or "").strip()
            if free > 0:
                return False, f"Распредели все очки статов — осталось {free}", None
            if not passive:
                return False, "Выбери пассивный бонус перед сохранением", None

            equipped = self._is_slot_equipped(cursor, user_id, class_id)
            old_vec = self._usdt_stat_vector(cursor, user_id, _USDT_CI(class_id)) if equipped else None

            cursor.execute(
                "UPDATE user_inventory SET stats_applied=1 WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )

            if equipped:
                new_vec = self._usdt_stat_vector(cursor, user_id, _USDT_CI(class_id))
                self._apply_stat_delta_to_player(
                    cursor, user_id,
                    new_vec["strength"] - old_vec["strength"],
                    new_vec["endurance"] - old_vec["endurance"],
                    new_vec["crit"] - old_vec["crit"],
                    new_vec["max_hp"] - old_vec["max_hp"],
                )

            cursor.execute(
                "SELECT * FROM user_inventory WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )
            item = dict(cursor.fetchone())
            conn.commit()
            return True, "Сборка сохранена", item
        except Exception as e:
            conn.rollback()
            return False, f"Ошибка: {str(e)}", None
        finally:
            conn.close()

    def set_usdt_passive(self, user_id: int, class_id: str, passive_type: str) -> Tuple[bool, str, Optional[dict]]:
        """Установить/снять боевую пассивку. Работает только до сохранения сборки."""
        pt = passive_type.strip() if passive_type else ""
        if pt and pt not in _VALID_PASSIVES:
            return False, f"Неверный тип пассивки: {pt}", None
        if not self.has_class(user_id, class_id):
            return False, "USDT-образ не найден", None

        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            if self._get_stats_applied(cursor, user_id, class_id):
                return False, "Сборка сохранена — изменения заблокированы. Нужен сброс.", None

            cursor.execute(
                "UPDATE user_inventory SET passive_type=? WHERE user_id=? AND class_id=?",
                (pt or None, user_id, class_id),
            )
            cursor.execute(
                "SELECT * FROM user_inventory WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )
            item = dict(cursor.fetchone())
            conn.commit()
            return True, "Пассивка обновлена", item
        except Exception as e:
            conn.rollback()
            return False, f"Ошибка: {str(e)}", None
        finally:
            conn.close()

    def get_equipped_usdt_passive(self, user_id: int) -> str:
        """Вернуть passive_type надетого USDT-слота, либо пустую строку."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT passive_type FROM user_inventory
                   WHERE user_id=? AND class_type='usdt' AND equipped=TRUE AND stats_applied=1
                   LIMIT 1""",
                (user_id,),
            )
            row = cursor.fetchone()
            return (self._row_get(row, "passive_type") or "").strip()
        except Exception:
            return ""
        finally:
            conn.close()
