"""Пересчёт статов игрока при рассинхроне.

После сноса legacy class-системы тут только resync_player_stats — он не
трогает user_inventory (таблица удалена), а считает чистые базовые статы
из уровня и аватара. Никаких UPDATE равен_классу/UPDATE class_id.
"""

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


class InventoryUnequipResyncMixin:

    def resync_player_stats(self, user_id: int, *, _cursor=None, _in_tx: bool = False) -> Tuple[bool, str]:
        """Починка статов игрока при некорректных значениях.

        Считает базовые str/end/crit/max_hp из уровня + аватара. Не трогает
        слот brony — он живёт через player_equipment + armor_custom_mods и
        даёт статы через get_equipment_stats.
        """
        own_conn = None
        cursor = _cursor
        if cursor is None:
            own_conn = self.get_connection()
            cursor = own_conn.cursor()
        try:
            cursor.execute(
                "UPDATE players SET equipped_avatar_id = 'base_neutral' WHERE user_id = ?",
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

            # Бонус base_neutral (аватар сброшен в base_neutral выше)
            av_bonus = self._effective_avatar_bonus("base_neutral", lv)
            new_str += int(av_bonus.get("strength", 0))
            new_agi += int(av_bonus.get("endurance", 0))
            new_int += int(av_bonus.get("crit", 0))
            new_mhp += int(av_bonus.get("hp_flat", 0))

            old_mhp = max(1, cur_mhp)
            _raw_chp = self._row_get(p, "current_hp", old_mhp)
            old_chp = max(1, old_mhp if _raw_chp is None else int(_raw_chp))
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
