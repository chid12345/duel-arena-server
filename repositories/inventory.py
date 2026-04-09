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
    STAMINA_PER_FREE_STAT,
)


class InventoryMixin:
    """Mixin: инвентарь классов, покупка, переключение, USDT-образы."""

    def _ensure_inventory_schema(self, cursor) -> None:
        """Safety net: гарантирует наличие user_inventory и полей классов в players."""
        is_pg = bool(getattr(self, "_pg", False))
        if is_pg:
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS user_inventory (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    class_id TEXT NOT NULL,
                    class_type TEXT NOT NULL,
                    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    equipped BOOLEAN DEFAULT FALSE,
                    custom_name TEXT,
                    strength_saved INTEGER DEFAULT 0,
                    agility_saved INTEGER DEFAULT 0,
                    intuition_saved INTEGER DEFAULT 0,
                    endurance_saved INTEGER DEFAULT 0,
                    free_stats_saved INTEGER DEFAULT 0,
                    UNIQUE(user_id, class_id)
                )"""
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory (user_id, class_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON user_inventory (user_id, equipped) WHERE equipped = TRUE")
            for col in ("current_class", "current_class_type"):
                cursor.execute(
                    """SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'players' AND column_name = %s LIMIT 1""",
                    (col,),
                )
                if not cursor.fetchone():
                    cursor.execute(f"ALTER TABLE players ADD COLUMN {col} TEXT")
        else:
            cursor.execute(
                """CREATE TABLE IF NOT EXISTS user_inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    class_id TEXT NOT NULL,
                    class_type TEXT NOT NULL,
                    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    equipped BOOLEAN DEFAULT FALSE,
                    custom_name TEXT,
                    strength_saved INTEGER DEFAULT 0,
                    agility_saved INTEGER DEFAULT 0,
                    intuition_saved INTEGER DEFAULT 0,
                    endurance_saved INTEGER DEFAULT 0,
                    free_stats_saved INTEGER DEFAULT 0,
                    FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
                    UNIQUE(user_id, class_id)
                )"""
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory (user_id, class_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON user_inventory (user_id, equipped) WHERE equipped = TRUE")
            cursor.execute("PRAGMA table_info(players)")
            cols = {r[1] for r in cursor.fetchall()}
            if "current_class" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN current_class TEXT")
            if "current_class_type" not in cols:
                cursor.execute("ALTER TABLE players ADD COLUMN current_class_type TEXT")

    # ── Получение информации о классах ────────────────────────────────────────

    @staticmethod
    def _class_stat_vector(class_info: Optional[Dict]) -> Dict[str, int]:
        if not class_info:
            return {"strength": 0, "endurance": 0, "crit": 0, "max_hp": 0}
        return {
            "strength": int(class_info.get("bonus_strength", 0) or 0),
            # В проекте поле bonus_agility хранится в players.endurance
            "endurance": int(class_info.get("bonus_agility", 0) or 0),
            # В проекте поле bonus_intuition хранится в players.crit
            "crit": int(class_info.get("bonus_intuition", 0) or 0),
            # Выносливость класса трактуем как вложения в stamina (через HP)
            "max_hp": int(class_info.get("bonus_endurance", 0) or 0) * int(STAMINA_PER_FREE_STAT),
        }

    def _equipped_inventory_class_info(self, cursor, user_id: int) -> Optional[Dict]:
        cursor.execute(
            "SELECT class_id FROM user_inventory WHERE user_id = ? AND equipped = TRUE LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return self.get_class_info(row["class_id"])

    def _remove_legacy_avatar_bonus_with_cursor(self, cursor, user_id: int) -> None:
        """Снимает бонус старого avatar-catalog, чтобы не наслаивался на новую систему классов."""
        cursor.execute(
            "SELECT level, strength, endurance, crit, max_hp, current_hp, equipped_avatar_id "
            "FROM players WHERE user_id = ?",
            (user_id,),
        )
        p = cursor.fetchone()
        if not p:
            return

        avatar_id = (p.get("equipped_avatar_id") or "base_neutral").strip()
        if avatar_id in {"", "base_neutral"}:
            return

        level = int(p.get("level", 1) or 1)
        av = self._effective_avatar_bonus(avatar_id, level)
        d_str = int(av.get("strength", 0) or 0)
        d_end = int(av.get("endurance", 0) or 0)
        d_crit = int(av.get("crit", 0) or 0)
        d_hp = int(av.get("hp_flat", 0) or 0)
        new_max_hp = max(1, int(p["max_hp"]) - d_hp)
        new_current_hp = min(new_max_hp, max(1, int(p["current_hp"]) - d_hp))

        cursor.execute(
            """UPDATE players
               SET strength = ?, endurance = ?, crit = ?,
                   max_hp = ?, current_hp = ?, equipped_avatar_id = 'base_neutral'
               WHERE user_id = ?""",
            (
                max(1, int(p["strength"]) - d_str),
                max(1, int(p["endurance"]) - d_end),
                max(1, int(p["crit"]) - d_crit),
                new_max_hp,
                new_current_hp,
                user_id,
            ),
        )

    def get_class_info(self, class_id: str) -> Optional[Dict]:
        """Получить информацию о классе по ID."""
        if class_id in FREE_CLASSES:
            return {**FREE_CLASSES[class_id], "class_id": class_id, "class_type": "free"}
        elif class_id in GOLD_CLASSES:
            return {**GOLD_CLASSES[class_id], "class_id": class_id, "class_type": "gold"}
        elif class_id in DIAMONDS_CLASSES:
            return {**DIAMONDS_CLASSES[class_id], "class_id": class_id, "class_type": "diamonds"}
        elif class_id.startswith("usdt_custom_"):
            return {**USDT_CLASS_BASE, "class_id": class_id, "class_type": "usdt"}
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
        self._ensure_inventory_schema(cursor)
        cursor.execute(
            "SELECT * FROM user_inventory WHERE user_id = ? ORDER BY class_type, purchased_at",
            (user_id,)
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
            (user_id,)
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
            (user_id, class_id)
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
            (user_id,)
        )
        row = cursor.fetchone()
        conn.commit()
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
        self._ensure_inventory_schema(cursor)

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
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)

        try:
            # Проверяем, есть ли класс у пользователя
            cursor.execute(
                "SELECT class_type FROM user_inventory WHERE user_id = ? AND class_id = ? LIMIT 1",
                (user_id, class_id),
            )
            owned_row = cursor.fetchone()
            if not owned_row:
                return False, "У вас нет этого класса"
            target_type = (owned_row.get("class_type") or "").strip()

            class_info = self.get_class_info(class_id)
            if target_type != "usdt" and not class_info:
                return False, "Класс не найден"

            self._remove_legacy_avatar_bonus_with_cursor(cursor, user_id)

            # Вычисляем дельту между старым и новым обычными классами
            old_info = self._equipped_inventory_class_info(cursor, user_id)
            old_vec = self._class_stat_vector(old_info)
            new_vec = self._class_stat_vector(class_info) if target_type != "usdt" else {"strength": 0, "endurance": 0, "crit": 0}

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
                (class_id, target_type, user_id)
            )

            if target_type == "usdt":
                # Для USDT-образов загружаем сохранённые статы (абсолютный слепок)
                cursor.execute(
                    """SELECT strength_saved, agility_saved, intuition_saved, 
                              endurance_saved, free_stats_saved
                       FROM user_inventory 
                       WHERE user_id = ? AND class_id = ?""",
                    (user_id, class_id)
                )
                saved_stats = cursor.fetchone()
                if saved_stats:
                    # В players нет agility/intuition, используем endurance/crit
                    cursor.execute(
                        """UPDATE players 
                           SET strength = ?, endurance = ?, crit = ?, free_stats = ?,
                               equipped_avatar_id = 'base_neutral'
                           WHERE user_id = ?""",
                        (
                            saved_stats["strength_saved"],
                            saved_stats["agility_saved"],
                            saved_stats["intuition_saved"],
                            saved_stats["free_stats_saved"],
                            user_id
                        )
                    )
            else:
                d_str = new_vec["strength"] - old_vec["strength"]
                d_end = new_vec["endurance"] - old_vec["endurance"]
                d_crit = new_vec["crit"] - old_vec["crit"]
                d_hp = new_vec["max_hp"] - old_vec["max_hp"]
                cursor.execute("SELECT max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
                hp_row = cursor.fetchone()
                new_max_hp = max(1, int(hp_row["max_hp"]) + d_hp)
                new_current_hp = min(new_max_hp, max(1, int(hp_row["current_hp"]) + d_hp))
                cursor.execute(
                    """UPDATE players
                       SET strength = GREATEST(1, strength + ?),
                           endurance = GREATEST(1, endurance + ?),
                           crit = GREATEST(1, crit + ?),
                           max_hp = ?,
                           current_hp = ?,
                           equipped_avatar_id = 'base_neutral'
                       WHERE user_id = ?""",
                    (d_str, d_end, d_crit, new_max_hp, new_current_hp, user_id),
                )

            conn.commit()
            display_name = class_info["name"] if class_info else "USDT слот"
            return True, f"Переключен на класс '{display_name}'"

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
        self._ensure_inventory_schema(cursor)

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
        self._ensure_inventory_schema(cursor)

        try:
            # Получаем текущие статы игрока
            cursor.execute(
                """SELECT strength, endurance, crit, free_stats
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
                    stats["endurance"],
                    stats["crit"],
                    0,
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
        self._ensure_inventory_schema(cursor)
        cursor.execute(
            "SELECT 1 FROM user_inventory WHERE user_id = ? AND class_type = 'usdt' LIMIT 1",
            (user_id,)
        )
        has_usdt = cursor.fetchone() is not None
        conn.commit()
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