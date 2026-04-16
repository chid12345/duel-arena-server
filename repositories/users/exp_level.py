"""Безопасное начисление XP с пересчётом уровня (для квестов, заданий, battle pass)."""

from __future__ import annotations

from datetime import datetime
from typing import Dict

from config import (
    MAX_LEVEL,
    PLAYER_START_MAX_HP,
    PLAYER_START_LEVEL,
    exp_needed_for_next_level,
    intermediate_ap_steps_for_level,
    gold_when_reaching_level,
    hp_when_reaching_level,
    stats_when_reaching_level,
    diamonds_when_reaching_level,
)


class UsersExpLevelMixin:
    def grant_exp_with_levelup(
        self, user_id: int, exp_add: int, gold_add: int = 0, diamonds_add: int = 0,
    ) -> Dict:
        """Начислить XP + gold + diamonds с автоматическим пересчётом уровня.

        Возвращает {"ok": True, "leveled": bool, "new_level": int, ...}.
        Используется квестами/заданиями/battle pass вместо прямого UPDATE exp=exp+?.
        """
        conn = self.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT level, exp, exp_milestones, free_stats, gold, diamonds, "
                "max_hp, current_hp FROM players WHERE user_id=?",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                return {"ok": False}
            level = max(1, int(row["level"] or PLAYER_START_LEVEL))
            exp = int(row["exp"] or 0) + int(exp_add)
            mask = int(row["exp_milestones"] or 0)
            free_stats = int(row["free_stats"] or 0)
            gold = int(row["gold"] or 0) + int(gold_add)
            diamonds = int(row["diamonds"] or 0) + int(diamonds_add)
            max_hp = int(row["max_hp"] or PLAYER_START_MAX_HP)
            current_hp = int(row["current_hp"] or max_hp)

            leveled = False
            while level < MAX_LEVEL:
                need = exp_needed_for_next_level(level)
                if need <= 0:
                    break
                steps = max(1, intermediate_ap_steps_for_level(level))
                for k in range(1, steps + 1):
                    thr = (need * k) // (steps + 1)
                    if thr <= 0:
                        continue
                    bit = 1 << (k - 1)
                    if bit > 255:
                        break
                    if exp >= thr and not (mask & bit):
                        free_stats += 1
                        mask |= bit
                if exp < need:
                    break
                exp -= need
                level += 1
                leveled = True
                mask = 0
                gold += gold_when_reaching_level(level)
                max_hp += hp_when_reaching_level(level)
                current_hp = max_hp
                free_stats += stats_when_reaching_level(level)
                diamonds += diamonds_when_reaching_level(level)

            cur.execute(
                "UPDATE players SET level=?, exp=?, exp_milestones=?, free_stats=?, "
                "gold=?, diamonds=?, max_hp=?, current_hp=?, last_hp_regen=?, "
                "last_active=CURRENT_TIMESTAMP WHERE user_id=?",
                (level, exp, mask, free_stats, gold, diamonds, max_hp, current_hp,
                 datetime.utcnow().isoformat(), user_id),
            )
            conn.commit()
            return {"ok": True, "leveled": leveled, "new_level": level,
                    "gold": gold, "diamonds": diamonds, "xp": exp}
        finally:
            conn.close()
