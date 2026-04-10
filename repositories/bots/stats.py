"""Расчёт статов бота по уровню."""

from __future__ import annotations

import random
from typing import Tuple

from config import (
    MAX_LEVEL,
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
    PLAYER_START_MAX_HP,
    PLAYER_START_STRENGTH,
    STAMINA_PER_FREE_STAT,
)


class BotsStatsMixin:
    def _compute_bot_stats_for_level(self, level: int) -> Tuple[int, int, int, int]:
        from progression_loader import stats_when_reaching_level, hp_when_reaching_level, intermediate_ap_steps_for_level
        lv = max(1, min(MAX_LEVEL, int(level)))
        total_free = PLAYER_START_FREE_STATS
        auto_hp = 0
        for l in range(1, lv + 1):
            total_free += stats_when_reaching_level(l)
            auto_hp += hp_when_reaching_level(l)
            if l < lv:
                total_free += intermediate_ap_steps_for_level(l)

        arch = random.choice(("balanced", "brute", "skirmisher", "tank", "intuition"))
        weights = {
            "balanced": (2, 2, 2, 2),
            "brute": (4, 1, 1, 2),
            "skirmisher": (1, 4, 1, 2),
            "tank": (1, 1, 1, 5),
            "intuition": (1, 1, 4, 2),
        }
        ws, we, wc, wh = weights[arch]
        total_w = ws + we + wc + wh
        jitter = random.randint(-(total_free * 15 // 100), total_free * 15 // 100)
        tf = max(0, total_free + jitter)
        pts_s = (tf * ws) // total_w
        pts_e = (tf * we) // total_w
        pts_c = (tf * wc) // total_w
        pts_h = tf - pts_s - pts_e - pts_c

        s = max(1, PLAYER_START_STRENGTH + pts_s)
        e = max(1, PLAYER_START_ENDURANCE + pts_e)
        c = max(1, PLAYER_START_CRIT + pts_c)
        hp = max(PLAYER_START_MAX_HP, PLAYER_START_MAX_HP + auto_hp + pts_h * STAMINA_PER_FREE_STAT)
        return s, e, c, hp
