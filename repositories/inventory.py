"""
repositories/inventory.py — система инвентаря и классов.
Бесплатные/платные образы, USDT-классы, переключение статов.
"""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from config import (
    FREE_CLASSES,
    GOLD_CLASSES,
    DIAMONDS_CLASSES,
    USDT_CLASS_BASE,
    RESET_STATS_COST_DIAMONDS,
    RESET_STATS_COST_DIAMONDS_USDT,
)


class InventoryMixin:
    """Mixin: инвентарь классов, покупка, переключение, USDT-образы."""

    # ── Получение информации о классах ────────────────────────────────────────

    def get_class_info(self, class_id: str) -> Optional[Dict]:
        """Получить информацию о классе по ID."""
        if class_id in FREE_CLASSES:
            return {**FREE_CLASSES[class_id], "class_id": class_id, "class_type": "free"}
        elif class_id in GOLD_CLASSES:
            return {**GOLD_CLASSES[class_id], "class_id": class_id, "class_type": "gold"}
        elif class_id in DIAMONDS_CLASSES:
            return {**DIAMONDS_CLASSES[class_id], "class_id": class_id, "class_type": "diamonds"}
        return None

    def get_all_classes(self) -> Dict[str, List[Dict]]:
        """Получить все доступные классы сгруппированные по типу."""
        return {
            "free": [
                {**info, "class_id": cid, "class_type": "free"}
                for cid, info in FREE_CLASSES.items()
            ],
            "gold": [
                {**info, "class_id": cid, "class_type": "gold"}
                for cid, info in GOLD_CLASSES.items()
            ],
            "diamonds": [
                {**info, "class_id": cid, "class_type": "diamonds"}
                for cid, info in DIAMONDS_CLASSES.items()
            ],
        }

    # ── Работа с инвентарём ───────────────────────────────────────────────────

    def get_user_inventory(self, user_id: int) -> List[Dict]:
        """Получить весь инвентарь пользователя."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM user_inventory WHERE user_id = ? ORDER BY class_type, purchased_at",
            (user_id,)
        )
        inventory = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return inventory

    def get_equipped_class(self, user_id: int) -> Optional[Dict]:
        """Получить текущий экипированный класс."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM user_inventory WHERE user_id = ? AND equipped = TRUE",
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def has_class(self, user_id: int, class_id: str) -> bool:
        """Проверить, есть ли у пользователя класс."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM user_inventory WHERE user_id = ? AND class_id = ?",
            (user_id, class_id)
        )
        result = cursor.fetchone() is not None
        conn.close()
        return result

    def get_free_class_choice(self, user_id: int) -> Optional[str]:
        """Получить выбранный бесплатный класс (эксклюзивный выбор)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT class_id FROM user_inventory WHERE user_id = ? AND class_type = 'free'",
            (user_id,)
        )
        row = cursor.fetchone()
        conn.close()
        return row["class_id"] if row else None

    # ── Покупка классов ───────────────────────────────────────────────────────

    def purchase_class(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Купить класс. Возвращает (успех, сообщение)."""
        class_info = self.get_class_info(class_id)
        if not class_info:
            return False, "Класс не найден"

        # Проверяем, есть ли уже этот класс
        if self.has_class(user_id, class_id):
            return False, "У вас уже есть этот класс"

        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Получаем данные игрока
            cursor.execute(
                "SELECT gold, diamonds FROM players WHERE user_id = ?",
                (user_id,)
            )
            player = cursor.fetchone()
            if not player:
                return False, "Игрок не найден"

            # Проверяем валюту
            price_gold = class_info["price_gold"]
            price_diamonds = class_info["price_diamonds"]

            if price_gold > 0 and player["gold"] < price_gold:
                return False, f"Недостаточно золота. Нужно: {price_gold}"
            if price_diamonds > 0 and player["diamonds"] < price_diamonds:
                return False, f"Недостаточно алмазов. Нужно: {price_diamonds}"

            # Для бесплатных классов проверяем эксклюзивность
            if class_info["class_type"] == "free":
                cursor.execute(
                    "SELECT 1 FROM user_inventory WHERE user_id = ? AND class_type = 'free'",
                    (user_id,)
                )
                if cursor.fetchone():
                    return False, "Вы уже выбрали бесплатный класс"

            # Списание валюты
            if price_gold > 0:
                cursor.execute(
                    "UPDATE players SET gold = gold - ? WHERE user_id = ?",
                    (price_gold, user_id)
                )
            if price_diamonds > 0:
                cursor.execute(
                    "UPDATE players SET diamonds = diamonds - ? WHERE user_id = ?",
                    (price_diamonds, user_id)
                )

            # Добавляем в инвентарь
            cursor.execute(
                """INSERT INTO user_inventory 
                   (user_id, class_id, class_type, equipped, purchased_at)
                   VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)""",
                (user_id, class_id, class_info["class_type"], False)
            )

            # Если это первый класс - экипируем его
            cursor.execute(
                "SELECT COUNT(*) as count FROM user_inventory WHERE user_id = ?",
                (user_id,)
            )
            count = cursor.fetchone()["count"]
            if count == 1:
                cursor.execute(
                    "UPDATE user_inventory SET equipped = TRUE WHERE user_id = ? AND class_id = ?",
                    (user_id, class_id)
                )
                # Обновляем текущий класс в players
                cursor.execute(
                    "UPDATE players SET current_class = ?, current_class_type = ? WHERE user_id = ?",
                    (class_id, class_info["class_type"], user_id)
                )

            conn.commit()
            return True, f"Класс '{class_info['name']}' куплен!"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка покупки: {str(e)}"
        finally:
            conn.close()

    # ── Переключение классов ──────────────────────────────────────────────────

    def switch_class(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Переключиться на другой класс. Возвращает (успех, сообщение)."""
        # Проверяем, есть ли класс у пользователя
        if not self.has_class(user_id, class_id):
            return False, "У вас нет этого класса"

        class_info = self.get_class_info(class_id)
        if not class_info:
            return False, "Класс не найден"

        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Снимаем экипировку со всех классов
            cursor.execute(
                "UPDATE user_inventory SET equipped = FALSE WHERE user_id = ?",
                (user_id,)
            )

            # Экипируем выбранный класс
            cursor.execute(
                "UPDATE user_inventory SET equipped = TRUE WHERE user_id = ? AND class_id = ?",
                (user_id, class_id)
            )

            # Обновляем текущий класс в players
            cursor.execute(
                "UPDATE players SET current_class = ?, current_class_type = ? WHERE user_id = ?",
                (class_id, class_info["class_type"], user_id)
            )

            # Для USDT-образов загружаем сохранённые статы
            if class_info["class_type"] == "usdt":
                cursor.execute(
                    """SELECT strength_saved, agility_saved, intuition_saved, 
                              endurance_saved, free_stats_saved
                       FROM user_inventory 
                       WHERE user_id = ? AND class_id = ?""",
                    (user_id, class_id)
                )
                saved_stats = cursor.fetchone()
                if saved_stats:
                    # Применяем сохранённые статы
                    cursor.execute(
                        """UPDATE players 
                           SET strength = ?, agility = ?, intuition = ?,
                               endurance = ?, free_stats = ?
                           WHERE user_id = ?""",
                        (
                            saved_stats["strength_saved"],
                            saved_stats["agility_saved"],
                            saved_stats["intuition_saved"],
                            saved_stats["endurance_saved"],
                            saved_stats["free_stats_saved"],
                            user_id
                        )
                    )

            conn.commit()
            return True, f"Переключен на класс '{class_info['name']}'"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка переключения: {str(e)}"
        finally:
            conn.close()

    # ── USDT-образы ──────────────────────────────────────────────────────────

    def create_usdt_class(self, user_id: int, custom_name: str = None) -> Tuple[bool, str, str]:
        """Создать новый USDT-образ. Возвращает (успех, сообщение, class_id)."""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Генерируем уникальный ID для USDT-образа
            usdt_count = cursor.execute(
                "SELECT COUNT(*) as count FROM user_inventory WHERE user_id = ? AND class_type = 'usdt'",
                (user_id,)
            ).fetchone()["count"]
            
            class_id = f"usdt_custom_{user_id}_{usdt_count + 1}"
            display_name = custom_name or f"Кастомный {usdt_count + 1}"

            # Создаём USDT-образ
            cursor.execute(
                """INSERT INTO user_inventory 
                   (user_id, class_id, class_type, custom_name, equipped, purchased_at)
                   VALUES (?, ?, 'usdt', ?, FALSE, CURRENT_TIMESTAMP)""",
                (user_id, class_id, display_name)
            )

            conn.commit()
            return True, f"Создан USDT-образ '{display_name}'", class_id

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка создания USDT-образа: {str(e)}", ""
        finally:
            conn.close()

    def save_usdt_stats(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Сохранить текущие статы в USDT-образ."""
        if not self.has_class(user_id, class_id):
            return False, "У вас нет этого USDT-образа"

        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            # Получаем текущие статы игрока
            cursor.execute(
                """SELECT strength, agility, intuition, endurance, free_stats
                   FROM players WHERE user_id = ?""",
                (user_id,)
            )
            stats = cursor.fetchone()
            if not stats:
                return False, "Игрок не найден"

            # Сохраняем статы в USDT-образ
            cursor.execute(
                """UPDATE user_inventory 
                   SET strength_saved = ?, agility_saved = ?, intuition_saved = ?,
                       endurance_saved = ?, free_stats_saved = ?
                   WHERE user_id = ? AND class_id = ?""",
                (
                    stats["strength"],
                    stats["agility"],
                    stats["intuition"],
                    stats["endurance"],
                    stats["free_stats"],
                    user_id,
                    class_id
                )
            )

            conn.commit()
            return True, "Статы сохранены в USDT-образ"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка сохранения статов: {str(e)}"
        finally:
            conn.close()

    def get_reset_stats_cost(self, user_id: int) -> int:
        """Получить стоимость сброса статов (скидка 50% для владельцев USDT)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM user_inventory WHERE user_id = ? AND class_type = 'usdt' LIMIT 1",
            (user_id,)
        )
        has_usdt = cursor.fetchone() is not None
        conn.close()
        
        return RESET_STATS_COST_DIAMONDS_USDT if has_usdt else RESET_STATS_COST_DIAMONDS

    # ── Утилиты ──────────────────────────────────────────────────────────────

    def get_available_classes_for_user(self, user_id: int) -> Dict[str, List[Dict]]:
        """Получить все классы с отметкой о наличии у пользователя."""
        all_classes = self.get_all_classes()
        user_inventory = {item["class_id"]: item for item in self.get_user_inventory(user_id)}
        
        result = {}
        for class_type, classes in all_classes.items():
            result[class_type] = []
            for cls in classes:
                cls_copy = cls.copy()
                cls_copy["owned"] = cls["class_id"] in user_inventory
                cls_copy["equipped"] = user_inventory.get(cls["class_id"], {}).get("equipped", False)
                result[class_type].append(cls_copy)
        
        return result

    def get_class_bonuses(self, class_id: str) -> Dict[str, int]:
        """Получить бонусы класса."""
        class_info = self.get_class_info(class_id)
        if not class_info:
            return {}
        
        return {
            "strength": class_info.get("bonus_strength", 0),
            "agility": class_info.get("bonus_agility", 0),
            "intuition": class_info.get("bonus_intuition", 0),
            "endurance": class_info.get("bonus_endurance", 0),
            "special_bonus": class_info.get("special_bonus", ""),
        }