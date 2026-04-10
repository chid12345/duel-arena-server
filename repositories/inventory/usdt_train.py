"""Распределение статов USDT-образа (+/-) и выбор пассивной способности."""

from __future__ import annotations

from typing import Optional, Tuple


_VALID_STATS = ("strength", "agility", "intuition", "stamina")
_STAT_COL = {
    "strength":  "strength_saved",
    "agility":   "agility_saved",
    "intuition": "intuition_saved",
    "stamina":   "stamina_saved",
}


class InventoryUsdtTrainMixin:
    def train_usdt_stat(self, user_id: int, class_id: str, stat: str) -> Tuple[bool, str, Optional[dict]]:
        """Вложить 1 очко в стат USDT-образа. Возвращает (ok, msg, item_row)."""
        if stat not in _VALID_STATS:
            return False, f"Неверный стат: {stat}", None
        if not self.has_class(user_id, class_id):
            return False, "USDT-образ не найден", None

        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            cursor.execute(
                "SELECT free_stats_saved FROM user_inventory WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )
            row = cursor.fetchone()
            free = int(self._row_get(row, "free_stats_saved", 0) or 0)
            if free <= 0:
                return False, "Нет свободных очков", None

            col = _STAT_COL[stat]
            cursor.execute(
                f"""UPDATE user_inventory
                    SET free_stats_saved = free_stats_saved - 1,
                        {col} = {col} + 1
                    WHERE user_id=? AND class_id=?""",
                (user_id, class_id),
            )
            cursor.execute(
                "SELECT * FROM user_inventory WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )
            item = dict(cursor.fetchone())
            conn.commit()
            return True, "Стат увеличен", item
        except Exception as e:
            conn.rollback()
            return False, f"Ошибка: {str(e)}", None
        finally:
            conn.close()

    def untrain_usdt_stat(self, user_id: int, class_id: str, stat: str) -> Tuple[bool, str, Optional[dict]]:
        """Вернуть 1 очко из стата обратно в пул. Возвращает (ok, msg, item_row)."""
        if stat not in _VALID_STATS:
            return False, f"Неверный стат: {stat}", None
        if not self.has_class(user_id, class_id):
            return False, "USDT-образ не найден", None

        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            col = _STAT_COL[stat]
            cursor.execute(
                f"SELECT {col}, free_stats_saved FROM user_inventory WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )
            row = cursor.fetchone()
            cur_val = int(self._row_get(row, col, 0) or 0)
            if cur_val <= 0:
                return False, "Нечего снимать", None

            cursor.execute(
                f"""UPDATE user_inventory
                    SET free_stats_saved = free_stats_saved + 1,
                        {col} = {col} - 1
                    WHERE user_id=? AND class_id=?""",
                (user_id, class_id),
            )
            cursor.execute(
                "SELECT * FROM user_inventory WHERE user_id=? AND class_id=?",
                (user_id, class_id),
            )
            item = dict(cursor.fetchone())
            conn.commit()
            return True, "Стат уменьшен", item
        except Exception as e:
            conn.rollback()
            return False, f"Ошибка: {str(e)}", None
        finally:
            conn.close()

    def set_usdt_passive(self, user_id: int, class_id: str, passive_type: str) -> Tuple[bool, str, Optional[dict]]:
        """Установить пассивный бонус USDT-образа. passive_type = '' снимает бонус."""
        pt = passive_type.strip() if passive_type else ""
        if pt and pt not in _VALID_STATS:
            return False, f"Неверный тип пассивки: {pt}", None
        if not self.has_class(user_id, class_id):
            return False, "USDT-образ не найден", None

        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
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
