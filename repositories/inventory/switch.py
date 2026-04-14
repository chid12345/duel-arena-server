"""Переключение активного класса — единая delta-модель для всех типов."""

from __future__ import annotations

from typing import Tuple

from config import STAMINA_PER_FREE_STAT

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

            # Применяем delta (единая логика для всех типов)
            d_str = new_vec["strength"] - old_vec["strength"]
            d_end = new_vec["endurance"] - old_vec["endurance"]
            d_crit = new_vec["crit"] - old_vec["crit"]
            d_hp = new_vec["max_hp"] - old_vec["max_hp"]

            self._apply_stat_delta_to_player(cursor, user_id, d_str, d_end, d_crit, d_hp)
            cursor.execute(
                "UPDATE players SET equipped_avatar_id = 'base_neutral' WHERE user_id = ?",
                (user_id,),
            )

            conn.commit()
            return True, f"Переключен на класс '{class_info['name'] if class_info else 'USDT слот'}'"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка переключения: {str(e)}"
        finally:
            conn.close()

    def _apply_stat_delta_to_player(self, cursor, user_id: int,
                                    d_str: int, d_end: int, d_crit: int, d_hp: int) -> None:
        """Применить delta статов к players (min 1 для всех, HP скорректировать)."""
        cursor.execute("SELECT max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        hp_row = cursor.fetchone()
        new_max_hp = max(1, int(hp_row["max_hp"]) + d_hp)
        new_cur_hp = min(new_max_hp, max(1, int(hp_row["current_hp"]) + d_hp))
        if bool(getattr(self, "_pg", False)):
            cursor.execute(
                """UPDATE players SET strength=GREATEST(1,strength+?),
                   endurance=GREATEST(1,endurance+?), crit=GREATEST(1,crit+?),
                   max_hp=?, current_hp=? WHERE user_id=?""",
                (d_str, d_end, d_crit, new_max_hp, new_cur_hp, user_id),
            )
        else:
            cursor.execute(
                """UPDATE players
                   SET strength  = CASE WHEN (strength +?)<1 THEN 1 ELSE strength +? END,
                       endurance = CASE WHEN (endurance+?)<1 THEN 1 ELSE endurance+? END,
                       crit      = CASE WHEN (crit     +?)<1 THEN 1 ELSE crit     +? END,
                       max_hp=?, current_hp=? WHERE user_id=?""",
                (d_str,d_str, d_end,d_end, d_crit,d_crit, new_max_hp, new_cur_hp, user_id),
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
