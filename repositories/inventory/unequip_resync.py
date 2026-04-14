"""Снятие образа и пересчёт статов."""

from __future__ import annotations

from typing import Tuple

from config import (
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_STRENGTH,
    STAMINA_PER_FREE_STAT,
    expected_max_hp_from_level,
    stamina_stats_invested,
    total_free_stats_at_level,
)

_PG_UNEQUIP_SQL = """UPDATE players
   SET strength  = GREATEST(1, strength  - ?),
       endurance = GREATEST(1, endurance - ?),
       crit      = GREATEST(1, crit      - ?),
       max_hp = ?, current_hp = ?,
       current_class = NULL, current_class_type = NULL
   WHERE user_id = ?"""

_SQ_UNEQUIP_SQL = """UPDATE players
   SET strength  = CASE WHEN (strength  - ?) < 1 THEN 1 ELSE (strength  - ?) END,
       endurance = CASE WHEN (endurance - ?) < 1 THEN 1 ELSE (endurance - ?) END,
       crit      = CASE WHEN (crit      - ?) < 1 THEN 1 ELSE (crit      - ?) END,
       max_hp = ?, current_hp = ?,
       current_class = NULL, current_class_type = NULL
   WHERE user_id = ?"""


class InventoryUnequipResyncMixin:
    def unequip_class(self, user_id: int) -> Tuple[bool, str]:
        """Снять текущий образ/класс."""
        conn = self.get_connection()
        cursor = conn.cursor()
        self._ensure_inventory_schema(cursor)
        try:
            cur_info = self._player_current_class_info(cursor, user_id)
            cursor.execute("UPDATE user_inventory SET equipped = FALSE WHERE user_id = ?", (user_id,))

            vec_to_subtract = None
            if cur_info and cur_info.get("class_type") in {"free", "gold", "diamonds"}:
                vec_to_subtract = self._class_stat_vector(cur_info)
            elif cur_info and cur_info.get("class_type") == "usdt":
                # USDT: вычитаем ровно то, что было добавлено при equip (saved + пассивка)
                usdt_vec = self._usdt_stat_vector(cursor, user_id, cur_info)
                if any(v > 0 for v in usdt_vec.values()):
                    vec_to_subtract = usdt_vec

            if vec_to_subtract:
                vec = vec_to_subtract
                cursor.execute("SELECT max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
                hp_row = cursor.fetchone()
                new_max_hp = max(1, int(self._row_get(hp_row, "max_hp", 1) or 1) - int(vec["max_hp"]))
                new_current_hp = min(
                    new_max_hp,
                    max(1, int(self._row_get(hp_row, "current_hp", new_max_hp) or new_max_hp) - int(vec["max_hp"])),
                )
                if bool(getattr(self, "_pg", False)):
                    cursor.execute(_PG_UNEQUIP_SQL,
                        (vec["strength"], vec["endurance"], vec["crit"], new_max_hp, new_current_hp, user_id))
                else:
                    cursor.execute(_SQ_UNEQUIP_SQL,
                        (vec["strength"], vec["strength"], vec["endurance"], vec["endurance"],
                         vec["crit"], vec["crit"], new_max_hp, new_current_hp, user_id))
            else:
                cursor.execute(
                    "UPDATE players SET current_class = NULL, current_class_type = NULL WHERE user_id = ?",
                    (user_id,),
                )

            cursor.execute(
                "SELECT level, strength, endurance, crit, free_stats, max_hp, current_hp FROM players WHERE user_id = ?",
                (user_id,),
            )
            p = cursor.fetchone()
            lv = int(self._row_get(p, "level", 1) or 1)
            exp_hp = int(expected_max_hp_from_level(lv))
            if (
                int(self._row_get(p, "strength", PLAYER_START_STRENGTH) or PLAYER_START_STRENGTH) < PLAYER_START_STRENGTH
                or int(self._row_get(p, "endurance", PLAYER_START_ENDURANCE) or PLAYER_START_ENDURANCE)
                < PLAYER_START_ENDURANCE
                or int(self._row_get(p, "crit", PLAYER_START_CRIT) or PLAYER_START_CRIT) < PLAYER_START_CRIT
                or int(self._row_get(p, "max_hp", exp_hp) or exp_hp) < exp_hp
            ):
                self.resync_player_stats(user_id, _cursor=cursor, _in_tx=True)

            conn.commit()
            return True, "Образ снят"
        except Exception as e:
            conn.rollback()
            return False, f"Ошибка: {str(e)}"
        finally:
            conn.close()

    def resync_player_stats(self, user_id: int, *, _cursor=None, _in_tx: bool = False) -> Tuple[bool, str]:
        """Починка статов игрока при некорректных значениях."""
        own_conn = None
        cursor = _cursor
        if cursor is None:
            own_conn = self.get_connection()
            cursor = own_conn.cursor()
            self._ensure_inventory_schema(cursor)
        try:
            cursor.execute("UPDATE user_inventory SET equipped = FALSE WHERE user_id = ?", (user_id,))
            cursor.execute(
                "UPDATE players SET current_class = NULL, current_class_type = NULL, equipped_avatar_id = 'base_neutral' WHERE user_id = ?",
                (user_id,),
            )

            cursor.execute(
                "SELECT level, strength, endurance, crit, max_hp, current_hp, free_stats FROM players WHERE user_id = ?",
                (user_id,),
            )
            p = cursor.fetchone()
            if not p:
                return False, "Игрок не найден"
            lv = int(self._row_get(p, "level", 1) or 1)
            free_stats = max(0, int(self._row_get(p, "free_stats", 0) or 0))
            total_free = int(total_free_stats_at_level(lv))
            spent = max(0, total_free - free_stats)

            cur_str = int(self._row_get(p, "strength", PLAYER_START_STRENGTH) or PLAYER_START_STRENGTH)
            cur_agi = int(self._row_get(p, "endurance", PLAYER_START_ENDURANCE) or PLAYER_START_ENDURANCE)
            cur_int = int(self._row_get(p, "crit", PLAYER_START_CRIT) or PLAYER_START_CRIT)
            inv_str = max(0, cur_str - int(PLAYER_START_STRENGTH))
            inv_agi = max(0, cur_agi - int(PLAYER_START_ENDURANCE))
            inv_int = max(0, cur_int - int(PLAYER_START_CRIT))
            cur_mhp = int(self._row_get(p, "max_hp", expected_max_hp_from_level(lv)) or expected_max_hp_from_level(lv))
            inv_sta = max(0, int(stamina_stats_invested(cur_mhp, lv)))

            raw = [inv_str, inv_agi, inv_int, inv_sta]
            sraw = sum(raw)
            if spent <= 0:
                alloc = [0, 0, 0, 0]
            elif sraw <= 0:
                alloc = [spent, 0, 0, 0]
            elif sraw == spent:
                alloc = raw
            else:
                scaled = [r * spent / sraw for r in raw]
                floors = [int(x) for x in scaled]
                rem = spent - sum(floors)
                fracs = sorted([(scaled[i] - floors[i], i) for i in range(4)], reverse=True)
                for _ in range(rem):
                    floors[fracs[_ % 4][1]] += 1
                alloc = floors

            new_str = PLAYER_START_STRENGTH + alloc[0]
            new_agi = PLAYER_START_ENDURANCE + alloc[1]
            new_int = PLAYER_START_CRIT + alloc[2]
            base_hp = int(expected_max_hp_from_level(lv))
            new_mhp = max(1, base_hp + alloc[3] * int(STAMINA_PER_FREE_STAT))

            # Добавляем бонус base_neutral (аватар сброшен в base_neutral выше)
            av_bonus = self._effective_avatar_bonus("base_neutral", lv)
            new_str += int(av_bonus.get("strength", 0))
            new_agi += int(av_bonus.get("endurance", 0))
            new_int += int(av_bonus.get("crit", 0))
            new_mhp += int(av_bonus.get("hp_flat", 0))

            old_mhp = max(1, cur_mhp)
            old_chp = max(1, int(self._row_get(p, "current_hp", old_mhp) or old_mhp))
            new_chp = min(new_mhp, max(1, int(round(old_chp / old_mhp * new_mhp))))

            cursor.execute(
                "UPDATE players SET strength = ?, endurance = ?, crit = ?, max_hp = ?, current_hp = ?, avatar_bonus_applied = 1 WHERE user_id = ?",
                (int(new_str), int(new_agi), int(new_int), int(new_mhp), int(new_chp), user_id),
            )
            if own_conn and not _in_tx:
                own_conn.commit()
            return True, "Статы пересчитаны"
        except Exception as e:
            if own_conn and not _in_tx:
                own_conn.rollback()
            return False, f"Ошибка: {str(e)}"
        finally:
            if own_conn:
                own_conn.close()
