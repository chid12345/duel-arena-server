"""Переключение активного класса — единая delta-модель для всех типов."""

from __future__ import annotations

from typing import Tuple

from config import PLAYER_START_CRIT, PLAYER_START_ENDURANCE, PLAYER_START_STRENGTH, STAMINA_PER_FREE_STAT
from db_schema.equipment_items.armor import legacy_class_to_armor_item_id

_USDT_BASE_STAMINA = 5  # базовая выносливость Легендарный образа (даёт броню сразу)


class InventorySwitchMixin:
    def switch_class(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Переключиться на другой класс (включая Легендарный слоты)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            cursor.execute(
                "SELECT class_type FROM user_inventory WHERE user_id = ? AND class_id = ? LIMIT 1",
                (user_id, class_id),
            )
            owned_row = cursor.fetchone()
            if not owned_row:
                return False, "У вас нет этого класса"
            target_type = (self._row_get(owned_row, "class_type") or "").strip()

            class_info = self.get_class_info(class_id) if target_type != "usdt" else None
            if target_type != "usdt" and not class_info:
                return False, "Класс не найден"

            self._remove_legacy_avatar_bonus_with_cursor(cursor, user_id)

            # Вектор старого класса (чтобы вычесть его бонусы)
            old_info = self._equipped_inventory_class_info(cursor, user_id)
            old_vec = self._usdt_stat_vector(cursor, user_id, old_info)

            # Вектор нового класса / Легендарный слота
            if target_type == "usdt":
                new_vec = self._usdt_stat_vector(cursor, user_id, {"class_type": "usdt", "class_id": class_id})
            else:
                new_vec = self._class_stat_vector(class_info)

            # Обновляем инвентарь и current_class
            cursor.execute("UPDATE user_inventory SET equipped = FALSE WHERE user_id = ?", (user_id,))
            cursor.execute(
                "UPDATE user_inventory SET equipped = TRUE WHERE user_id = ? AND class_id = ?",
                (user_id, class_id),
            )
            cursor.execute(
                "UPDATE players SET current_class = ?, current_class_type = ? WHERE user_id = ?",
                (class_id, target_type, user_id),
            )

            # Унификация armor (шаг 3/6): dual-write в новые таблицы
            self._mirror_armor_to_unified_tables(cursor, user_id, class_id, target_type)

            # Применяем delta (единая логика для всех типов)
            d_str = new_vec["strength"] - old_vec["strength"]
            d_end = new_vec["endurance"] - old_vec["endurance"]
            d_crit = new_vec["crit"] - old_vec["crit"]
            d_hp = new_vec["max_hp"] - old_vec["max_hp"]

            self._apply_stat_delta_to_player(cursor, user_id, d_str, d_end, d_crit, d_hp)

            conn.commit()
            return True, f"Переключен на класс '{class_info['name'] if class_info else 'USDT слот'}'"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка переключения: {str(e)}"
        finally:
            conn.close()

    def _mirror_armor_to_unified_tables(self, cursor, user_id: int, class_id: str, class_type: str) -> None:
        """Унификация armor (шаг 3/6) — dual-write в новые таблицы.

        После UPDATE players.current_class пишем:
        - player_owned_armor — гарантируем владение item_id
        - player_equipment(slot='armor') — текущая надетая броня
        - armor_custom_mods (только для USDT) — синхронизируем saved-поля
        """
        item_id = legacy_class_to_armor_item_id(class_id)
        if not item_id:
            return
        cursor.execute(
            "INSERT INTO player_owned_armor (user_id, item_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            (user_id, item_id),
        )
        cursor.execute(
            """INSERT INTO player_equipment (user_id, slot, item_id)
               VALUES (?, 'armor', ?)
               ON CONFLICT(user_id, slot) DO UPDATE SET item_id=excluded.item_id, equipped_at=CURRENT_TIMESTAMP""",
            (user_id, item_id),
        )
        if class_type == "usdt":
            cursor.execute(
                """SELECT strength_saved, agility_saved, intuition_saved, endurance_saved,
                          custom_name, stats_applied
                   FROM user_inventory WHERE user_id=? AND class_id=?""",
                (user_id, class_id),
            )
            row = cursor.fetchone()
            if row is not None:
                cursor.execute(
                    """INSERT INTO armor_custom_mods
                           (user_id, item_id, str_bonus, agi_bonus, int_bonus, end_bonus, custom_name, applied)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                       ON CONFLICT(user_id, item_id) DO UPDATE SET
                           str_bonus=excluded.str_bonus,
                           agi_bonus=excluded.agi_bonus,
                           int_bonus=excluded.int_bonus,
                           end_bonus=excluded.end_bonus,
                           custom_name=excluded.custom_name,
                           applied=excluded.applied""",
                    (
                        user_id, item_id,
                        int(self._row_get(row, "strength_saved", 0) or 0),
                        int(self._row_get(row, "agility_saved", 0) or 0),
                        int(self._row_get(row, "intuition_saved", 0) or 0),
                        int(self._row_get(row, "endurance_saved", 0) or 0),
                        self._row_get(row, "custom_name"),
                        1 if bool(self._row_get(row, "stats_applied", False)) else 0,
                    ),
                )

    def _apply_stat_delta_to_player(self, cursor, user_id: int,
                                    d_str: int, d_end: int, d_crit: int, d_hp: int) -> None:
        """Применить delta статов к players (min 1 для всех, HP скорректировать)."""
        cursor.execute("SELECT max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        hp_row = cursor.fetchone()
        new_max_hp = max(1, int(hp_row["max_hp"]) + d_hp)
        new_cur_hp = min(new_max_hp, max(1, int(hp_row["current_hp"]) + d_hp))
        _min_s = int(PLAYER_START_STRENGTH)
        _min_e = int(PLAYER_START_ENDURANCE)
        _min_c = int(PLAYER_START_CRIT)
        if bool(getattr(self, "_pg", False)):
            cursor.execute(
                """UPDATE players SET strength=GREATEST(?,strength+?),
                   endurance=GREATEST(?,endurance+?), crit=GREATEST(?,crit+?),
                   max_hp=?, current_hp=? WHERE user_id=?""",
                (_min_s, d_str, _min_e, d_end, _min_c, d_crit, new_max_hp, new_cur_hp, user_id),
            )
        else:
            cursor.execute(
                """UPDATE players
                   SET strength  = CASE WHEN (strength +?)<? THEN ? ELSE strength +? END,
                       endurance = CASE WHEN (endurance+?)<? THEN ? ELSE endurance+? END,
                       crit      = CASE WHEN (crit     +?)<? THEN ? ELSE crit     +? END,
                       max_hp=?, current_hp=? WHERE user_id=?""",
                (d_str, _min_s, _min_s, d_str,
                 d_end, _min_e, _min_e, d_end,
                 d_crit, _min_c, _min_c, d_crit,
                 new_max_hp, new_cur_hp, user_id),
            )

    def _usdt_stat_vector(self, cursor, user_id: int, class_info) -> dict:
        """Вектор статов Легендарный слота.
        Базово: +5 выносливости (броня) всегда при надевании.
        Сохранённые 19 статов применяются только когда stats_applied=TRUE.
        Пассивка — боевой модификатор, не стат (не входит в вектор).
        """
        if not class_info:
            return {"strength": 0, "endurance": 0, "crit": 0, "max_hp": 0}
        if class_info.get("class_type") == "usdt":
            cid = class_info.get("class_id", "")
            cursor.execute(
                """SELECT strength_saved, agility_saved, intuition_saved, stamina_saved, stats_applied
                   FROM user_inventory WHERE user_id=? AND class_id=?""",
                (user_id, cid),
            )
            saved = cursor.fetchone()
            base_hp = _USDT_BASE_STAMINA * int(STAMINA_PER_FREE_STAT)
            if not bool(self._row_get(saved, "stats_applied", False)):
                # Статы ещё не сохранены — только базовая выносливость
                return {"strength": 0, "endurance": 0, "crit": 0, "max_hp": base_hp}
            return {
                "strength": int(self._row_get(saved, "strength_saved", 0) or 0),
                "endurance": int(self._row_get(saved, "agility_saved", 0) or 0),
                "crit":      int(self._row_get(saved, "intuition_saved", 0) or 0),
                "max_hp":    int(self._row_get(saved, "stamina_saved", 0) or 0) * int(STAMINA_PER_FREE_STAT) + base_hp,
            }
        return self._class_stat_vector(class_info)
