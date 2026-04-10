"""Переключение активного класса / USDT-слепок."""

from __future__ import annotations

from typing import Tuple

from config import STAMINA_PER_FREE_STAT, expected_max_hp_from_level


class InventorySwitchMixin:
    def switch_class(self, user_id: int, class_id: str) -> Tuple[bool, str]:
        """Переключиться на другой класс."""
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

            class_info = self.get_class_info(class_id)
            if target_type != "usdt" and not class_info:
                return False, "Класс не найден"

            self._remove_legacy_avatar_bonus_with_cursor(cursor, user_id)

            old_info = self._equipped_inventory_class_info(cursor, user_id)
            old_vec = self._class_stat_vector(old_info)
            new_vec = (
                self._class_stat_vector(class_info)
                if target_type != "usdt"
                else {"strength": 0, "endurance": 0, "crit": 0, "max_hp": 0}
            )

            cursor.execute(
                "UPDATE user_inventory SET equipped = FALSE WHERE user_id = ?",
                (user_id,),
            )

            cursor.execute(
                "UPDATE user_inventory SET equipped = TRUE WHERE user_id = ? AND class_id = ?",
                (user_id, class_id),
            )

            cursor.execute(
                "UPDATE players SET current_class = ?, current_class_type = ? WHERE user_id = ?",
                (class_id, target_type, user_id),
            )

            if target_type == "usdt":
                cursor.execute(
                    """SELECT strength_saved, agility_saved, intuition_saved,
                              stamina_saved, free_stats_saved, max_hp_saved, current_hp_saved
                       FROM user_inventory
                       WHERE user_id = ? AND class_id = ?""",
                    (user_id, class_id),
                )
                saved_stats = cursor.fetchone()
                # Если слот новый (все статы 0) — сначала авто-сохраняем текущие статы игрока
                if saved_stats and not any([
                    self._row_get(saved_stats, "strength_saved", 0),
                    self._row_get(saved_stats, "agility_saved", 0),
                    self._row_get(saved_stats, "intuition_saved", 0),
                    self._row_get(saved_stats, "stamina_saved", 0),
                ]):
                    cursor.execute(
                        """SELECT level, strength, endurance, crit, free_stats, max_hp, current_hp
                           FROM players WHERE user_id = ?""",
                        (user_id,),
                    )
                    p_now = cursor.fetchone()
                    if p_now:
                        from config import stamina_stats_invested
                        lv_now = int(self._row_get(p_now, "level", 1) or 1)
                        mhp_now = int(self._row_get(p_now, "max_hp", 1) or 1)
                        sta_pts = int(stamina_stats_invested(mhp_now, lv_now))
                        cursor.execute(
                            """UPDATE user_inventory
                               SET strength_saved=?, agility_saved=?, intuition_saved=?,
                                   stamina_saved=?, free_stats_saved=?, max_hp_saved=?, current_hp_saved=?
                               WHERE user_id=? AND class_id=?""",
                            (
                                p_now["strength"], p_now["endurance"], p_now["crit"],
                                sta_pts, p_now["free_stats"], mhp_now, p_now["current_hp"],
                                user_id, class_id,
                            ),
                        )
                        # перечитать saved_stats после авто-сохранения
                        cursor.execute(
                            """SELECT strength_saved, agility_saved, intuition_saved,
                                      stamina_saved, free_stats_saved, max_hp_saved, current_hp_saved
                               FROM user_inventory WHERE user_id=? AND class_id=?""",
                            (user_id, class_id),
                        )
                        saved_stats = cursor.fetchone()
                if saved_stats:
                    cursor.execute("SELECT level FROM players WHERE user_id = ?", (user_id,))
                    row_lv = cursor.fetchone()
                    level = int(self._row_get(row_lv, "level", 1) or 1)

                    stamina_pts = int(self._row_get(saved_stats, "stamina_saved", 0) or 0)
                    max_hp = max(1, int(expected_max_hp_from_level(level)) + stamina_pts * int(STAMINA_PER_FREE_STAT))

                    chp = self._row_get(saved_stats, "current_hp_saved")
                    if not chp or int(chp) <= 0:
                        cursor.execute("SELECT current_hp, max_hp FROM players WHERE user_id = ?", (user_id,))
                        cur_row = cursor.fetchone()
                        cur_mhp = max(1, int(self._row_get(cur_row, "max_hp", max_hp) or max_hp))
                        cur_chp = max(1, int(self._row_get(cur_row, "current_hp", cur_mhp) or cur_mhp))
                        chp = int(round(cur_chp / cur_mhp * max_hp))
                    current_hp = min(max_hp, max(1, int(chp)))

                    cursor.execute(
                        """UPDATE players 
                           SET strength = ?, endurance = ?, crit = ?, free_stats = ?,
                               max_hp = ?, current_hp = ?,
                               equipped_avatar_id = 'base_neutral'
                           WHERE user_id = ?""",
                        (
                            saved_stats["strength_saved"],
                            saved_stats["agility_saved"],
                            saved_stats["intuition_saved"],
                            saved_stats["free_stats_saved"],
                            max_hp,
                            current_hp,
                            user_id,
                        ),
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
                if bool(getattr(self, "_pg", False)):
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
                else:
                    cursor.execute(
                        """UPDATE players
                           SET strength = CASE WHEN (strength + ?) < 1 THEN 1 ELSE (strength + ?) END,
                               endurance = CASE WHEN (endurance + ?) < 1 THEN 1 ELSE (endurance + ?) END,
                               crit = CASE WHEN (crit + ?) < 1 THEN 1 ELSE (crit + ?) END,
                               max_hp = ?,
                               current_hp = ?,
                               equipped_avatar_id = 'base_neutral'
                           WHERE user_id = ?""",
                        (d_str, d_str, d_end, d_end, d_crit, d_crit, new_max_hp, new_current_hp, user_id),
                    )

            conn.commit()
            display_name = class_info["name"] if class_info else "USDT слот"
            return True, f"Переключен на класс '{display_name}'"

        except Exception as e:
            conn.rollback()
            return False, f"Ошибка переключения: {str(e)}"
        finally:
            conn.close()
