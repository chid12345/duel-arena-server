"""Инвентарь и покупка классов."""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple


class InventoryCrudMixin:
    def get_user_inventory(self, user_id: int) -> List[Dict]:
        """Получить весь инвентарь пользователя."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        cursor.execute(
            "SELECT * FROM user_inventory WHERE user_id = ? ORDER BY class_type, purchased_at",
            (user_id,),
        )
        inventory = [dict(row) for row in cursor.fetchall()]
        conn.commit()
        conn.close()
        return inventory

    def get_equipped_class(self, user_id: int) -> Optional[Dict]:
        """Получить текущий экипированный класс."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        cursor.execute(
            "SELECT * FROM user_inventory WHERE user_id = ? AND equipped = TRUE",
            (user_id,),
        )
        row = cursor.fetchone()
        conn.commit()
        conn.close()
        return dict(row) if row else None

    def has_class(self, user_id: int, class_id: str) -> bool:
        """Проверить, есть ли у пользователя класс."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        cursor.execute(
            "SELECT 1 FROM user_inventory WHERE user_id = ? AND class_id = ?",
            (user_id, class_id),
        )
        result = cursor.fetchone() is not None
        conn.commit()
        conn.close()
        return result

    def get_free_class_choice(self, user_id: int) -> Optional[str]:
        """Получить выбранный бесплатный класс (эксклюзивный выбор)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        cursor.execute(
            "SELECT class_id FROM user_inventory WHERE user_id = ? AND class_type = 'free'",
            (user_id,),
        )
        row = cursor.fetchone()
        conn.commit()
        conn.close()
        return row["class_id"] if row else None

    def purchase_class(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Купить класс. Возвращает (успех, сообщение)."""
        class_info = self.get_class_info(class_id)
        if not class_info:
            return False, "Класс не найден"

        if self.has_class(user_id, class_id):
            return False, "У вас уже есть этот класс"

        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)

        try:
            cursor.execute(
                "SELECT gold, diamonds FROM players WHERE user_id = ?",
                (user_id,),
            )
            player = cursor.fetchone()
            if not player:
                return False, "Игрок не найден"

            price_gold = class_info["price_gold"]
            price_diamonds = class_info["price_diamonds"]

            if price_gold > 0 and player["gold"] < price_gold:
                return False, f"Недостаточно золота. Нужно: {price_gold}"
            if price_diamonds > 0 and player["diamonds"] < price_diamonds:
                return False, f"Недостаточно алмазов. Нужно: {price_diamonds}"

            if class_info["class_type"] == "free":
                cursor.execute(
                    "SELECT 1 FROM user_inventory WHERE user_id = ? AND class_type = 'free'",
                    (user_id,),
                )
                if cursor.fetchone():
                    return False, "Вы уже выбрали бесплатный класс"

            if price_gold > 0:
                cursor.execute(
                    "UPDATE players SET gold = gold - ? WHERE user_id = ?",
                    (price_gold, user_id),
                )
            if price_diamonds > 0:
                cursor.execute(
                    "UPDATE players SET diamonds = diamonds - ? WHERE user_id = ?",
                    (price_diamonds, user_id),
                )

            cursor.execute(
                """INSERT INTO user_inventory 
                   (user_id, class_id, class_type, equipped, purchased_at)
                   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (user_id, class_id, class_info["class_type"], False),
            )

            cursor.execute(
                "SELECT COUNT(*) as count FROM user_inventory WHERE user_id = ?",
                (user_id,),
            )
            count = cursor.fetchone()["count"]
            if count == 1:
                cursor.execute(
                    "UPDATE user_inventory SET equipped = TRUE WHERE user_id = ? AND class_id = ?",
                    (user_id, class_id),
                )
                self._remove_legacy_avatar_bonus_with_cursor(cursor, user_id)
                v = self._class_stat_vector(class_info)
                cursor.execute(
                    "SELECT max_hp, current_hp FROM players WHERE user_id = ?",
                    (user_id,),
                )
                hp_row = cursor.fetchone()
                hp_delta = int(v["max_hp"])
                new_max_hp = max(1, int(hp_row["max_hp"]) + hp_delta)
                new_current_hp = min(new_max_hp, max(1, int(hp_row["current_hp"]) + hp_delta))
                cursor.execute(
                    """UPDATE players
                       SET strength = strength + ?, endurance = endurance + ?, crit = crit + ?,
                           max_hp = ?, current_hp = ?
                       WHERE user_id = ?""",
                    (v["strength"], v["endurance"], v["crit"], new_max_hp, new_current_hp, user_id),
                )
                cursor.execute(
                    "UPDATE players SET current_class = ?, current_class_type = ? WHERE user_id = ?",
                    (class_id, class_info["class_type"], user_id),
                )

            conn.commit()
            return True, f"Класс '{class_info['name']}' куплен!"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка покупки: {str(e)}"
        finally:
            conn.close()
