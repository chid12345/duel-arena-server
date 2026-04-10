"""Генерация имени и строки бота."""

from __future__ import annotations

import random
import uuid
from typing import Any, Dict, Tuple

from config import BOT_NAMES, BOT_PREFIXES, MAX_LEVEL, PLAYER_START_CRIT


class BotsGenerateMixin:
    def _generate_bot_data(self, level: int):
        level = max(1, min(MAX_LEVEL, int(level)))
        if level <= 10:
            bot_type = "novice"
            prefix = random.choice(BOT_PREFIXES["novice"])
        elif level <= 30:
            bot_type = "warrior"
            prefix = random.choice(BOT_PREFIXES["warrior"])
        elif level <= 50:
            bot_type = "master"
            prefix = random.choice(BOT_PREFIXES["master"])
        else:
            bot_type = "legend"
            prefix = random.choice(BOT_PREFIXES["legend"])
        name = f"{prefix}_{random.choice(BOT_NAMES)}_{uuid.uuid4().hex[:8]}"
        strength, endurance, crit, max_hp = self._compute_bot_stats_for_level(level)
        ai_pattern = random.choice(("aggressive", "defensive", "balanced"))
        return (name, level, strength, endurance, crit, max_hp, max_hp, bot_type, ai_pattern)

    def _insert_bot_row(self, cursor, bot_tuple: Tuple[Any, ...]) -> None:
        cursor.execute(
            "INSERT OR IGNORE INTO bots "
            "(name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            bot_tuple,
        )

    @staticmethod
    def _normalize_bot_dict(row_dict: Dict) -> Dict:
        d = dict(row_dict)
        if d.get("crit") is None:
            d["crit"] = PLAYER_START_CRIT
        return d

    def _random_bot_level_above_10(self) -> int:
        hi = min(100, int(MAX_LEVEL))
        lo = 11
        if hi < lo:
            return max(1, min(10, int(MAX_LEVEL)))
        r = random.random()
        if r < 0.50:
            return random.randint(lo, min(30, hi))
        if r < 0.80:
            a, b = max(lo, 31), min(50, hi)
            return random.randint(a, b) if a <= b else random.randint(lo, hi)
        a, b = max(lo, 51), hi
        return random.randint(a, b) if a <= b else random.randint(lo, hi)
