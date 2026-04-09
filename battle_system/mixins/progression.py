"""AUTO: фрагмент бывшего battle_system.py — не править руками без сверки с логикой боя."""
from __future__ import annotations

import asyncio
import logging
import random
import time
from html import escape as html_escape
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from config import *
from database import db

from battle_system.models import BattleRound, BattleResult

logger = logging.getLogger(__name__)

class BattleProgressionMixin:
    def _exp_progression_updates(self, player: Dict, exp_gained: int, max_level_ups: int = 1) -> Tuple[Dict, bool]:
        """
        Начислить опыт: промежуточные +1 стат по «апам» из таблицы (пороги need*k/steps),
        ап уровня — награды из progression.json. exp_milestones — битовая маска пройденных апов на текущей полоске.
        Сигнальные уровни (каждые 10): доп. статы + золото + алмазы из diamonds_on_reach.
        """
        exp = int(player.get('exp', 0)) + int(exp_gained)
        level = max(1, int(player.get('level', PLAYER_START_LEVEL)))
        mask = int(player.get('exp_milestones', 0) or 0)
        free_stats = int(player.get('free_stats', 0) or 0)
        gold = int(player.get('gold', 0) or 0)
        diamonds = int(player.get('diamonds', 0) or 0)
        max_hp = int(player.get('max_hp', PLAYER_START_MAX_HP))
        current_hp = int(player.get('current_hp', max_hp))

        leveled = False
        gained_levels = 0
        while level < MAX_LEVEL:
            need = exp_needed_for_next_level(level)
            if need <= 0:
                break
            steps = intermediate_ap_steps_for_level(level)
            if steps < 1:
                steps = 1
            for k in range(1, steps + 1):
                # Ап на полоске должен выдаваться до апа уровня (по таблице XP на 1 ап).
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
            if gained_levels >= max(1, int(max_level_ups)):
                # Защита от аномалий (дубли итогов/гонки): максимум +N уровней за один бой.
                exp = min(exp, max(0, need - 1))
                break
            exp -= need
            level += 1
            gained_levels += 1
            leveled = True
            mask = 0
            gold     += gold_when_reaching_level(level)
            max_hp   += hp_when_reaching_level(level)
            current_hp = max_hp
            free_stats += stats_when_reaching_level(level)
            diamonds += diamonds_when_reaching_level(level)  # 0 на обычных, >0 на сигнальных (×10)

        return (
            {
                'exp':            exp,
                'level':          level,
                'exp_milestones': mask,
                'free_stats':     free_stats,
                'gold':           gold,
                'diamonds':       diamonds,
                'max_hp':         max_hp,
                'current_hp':     current_hp,
            },
            leveled,
        )
