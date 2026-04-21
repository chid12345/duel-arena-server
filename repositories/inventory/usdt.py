"""Легендарный слоты, сохранение статов, стоимость сброса, список классов для UI."""

from __future__ import annotations

from typing import Dict, List, Tuple

from config import (
    RESET_STATS_COST_DIAMONDS,
    RESET_STATS_COST_DIAMONDS_USDT,
    STAMINA_PER_FREE_STAT,
)

_USDT_BASE_STAMINA = 5  # базовая выносливость Легендарный образа (должна совпадать с switch.py)
_USDT_CI = lambda cid: {"class_type": "usdt", "class_id": cid}  # noqa: E731


class InventoryUsdtMixin:
    _USDT_MAX_NAME_LEN = 50

    def create_usdt_class(self, user_id: int, custom_name: str = None) -> Tuple[bool, str, str]:
        """Создать новый Легендарный образ. Возвращает (успех, сообщение, class_id)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)

        try:
            usdt_count = cursor.execute(
                "SELECT COUNT(*) as count FROM user_inventory WHERE user_id = ? AND class_type = 'usdt'",
                (user_id,),
            ).fetchone()["count"]

            class_id = f"usdt_custom_{user_id}_{usdt_count + 1}"
            display_name = (custom_name or f"Кастомный {usdt_count + 1}").strip()[: self._USDT_MAX_NAME_LEN] or f"Кастомный {usdt_count + 1}"

            cursor.execute(
                """INSERT INTO user_inventory
                   (user_id, class_id, class_type, custom_name, equipped,
                    free_stats_saved, strength_saved, agility_saved, intuition_saved,
                    endurance_saved, stamina_saved, max_hp_saved, current_hp_saved,
                    stats_applied, purchased_at)
                   VALUES (?, ?, 'usdt', ?, FALSE,
                    19, 0, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP)""",
                (user_id, class_id, display_name),
            )

            conn.commit()
            return True, f"Создан Легендарный образ '{display_name}'", class_id

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка создания Легендарный образа: {str(e)}", ""
        finally:
            conn.close()

    def save_usdt_stats(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Устарело — статы теперь задаются через train_usdt_stat. No-op."""
        if not self.has_class(user_id, class_id):
            return False, "У вас нет этого Легендарный образа"
        return True, "OK"

    def reset_usdt_slot_stats(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Сбросить сохранённые статы Легендарный образа (после оплаты).
        Если слот надет и applied=1 — снять дельту с персонажа.
        """
        if not self.has_class(user_id, class_id):
            return False, "Легендарный образ не найден"
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            equipped = self._is_slot_equipped(cursor, user_id, class_id)
            applied = self._get_stats_applied(cursor, user_id, class_id)

            if equipped and applied:
                # Снять дельту применённых статов с персонажа
                old_vec = self._usdt_stat_vector(cursor, user_id, _USDT_CI(class_id))
                base_hp = _USDT_BASE_STAMINA * int(STAMINA_PER_FREE_STAT)
                new_vec = {"strength": 0, "endurance": 0, "crit": 0, "max_hp": base_hp}
                self._apply_stat_delta_to_player(
                    cursor, user_id,
                    new_vec["strength"] - old_vec["strength"],
                    new_vec["endurance"] - old_vec["endurance"],
                    new_vec["crit"] - old_vec["crit"],
                    new_vec["max_hp"] - old_vec["max_hp"],
                )

            cursor.execute(
                """UPDATE user_inventory
                   SET strength_saved=0, agility_saved=0, intuition_saved=0,
                       endurance_saved=0, stamina_saved=0, free_stats_saved=19,
                       max_hp_saved=0, current_hp_saved=0, passive_type=NULL,
                       stats_applied=0
                   WHERE user_id=? AND class_id=?""",
                (user_id, class_id),
            )
            conn.commit()
            return True, "Статы образа сброшены"
        except Exception as e:
            conn.rollback()
            return False, f"Ошибка сброса: {str(e)}"
        finally:
            conn.close()

    def get_reset_stats_cost(self, user_id: int) -> int:
        """Получить стоимость сброса статов (скидка для владельцев USDT)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        cursor.execute(
            "SELECT 1 FROM user_inventory WHERE user_id = ? AND class_type = 'usdt' LIMIT 1",
            (user_id,),
        )
        has_usdt = cursor.fetchone() is not None
        conn.commit()
        conn.close()

        return RESET_STATS_COST_DIAMONDS_USDT if has_usdt else RESET_STATS_COST_DIAMONDS

    def get_available_classes_for_user(self, user_id: int) -> Dict[str, List[Dict]]:
        """Получить все классы с отметкой о наличии у пользователя."""
        all_classes = self.get_all_classes()
        user_inventory = {item["class_id"]: item for item in self.get_user_inventory(user_id)}

        result: Dict[str, List[Dict]] = {}
        for class_type, classes in all_classes.items():
            result[class_type] = []
            for cls in classes:
                cls_copy = cls.copy()
                cls_copy["owned"] = cls["class_id"] in user_inventory
                cls_copy["equipped"] = user_inventory.get(cls["class_id"], {}).get("equipped", False)
                result[class_type].append(cls_copy)

        return result

    def get_class_bonuses(self, class_id: str) -> Dict:
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
