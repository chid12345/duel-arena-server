"""Генерация имени и строки бота."""

from __future__ import annotations

import random
import uuid
from typing import Any, Dict, Tuple

from config import BOT_NAMES, BOT_PREFIXES, MAX_LEVEL, PLAYER_START_CRIT

# Этап 9: 9 вариантов warrior_type (3 класса × 3 модели). Боты получают
# случайный — в карточке боя соперник выглядит как живой игрок с
# Берсерком/Тенью/Хаос-Рыцарем.
BOT_WARRIOR_TYPES = (
    "tank_0", "tank_1", "tank_2",
    "agile_0", "agile_1", "agile_2",
    "crit_0", "crit_1", "crit_2",
)


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
        base = random.choice(BOT_NAMES)
        uid = uuid.uuid4().hex[:8]
        # Этап 9: префикс может быть пустым (новички). Не клеим лишний "_".
        name = f"{prefix}_{base}_{uid}" if prefix else f"{base}_{uid}"
        strength, endurance, crit, max_hp = self._compute_bot_stats_for_level(level)
        ai_pattern = random.choice(("aggressive", "defensive", "balanced"))
        warrior_type = random.choice(BOT_WARRIOR_TYPES)
        return (name, level, strength, endurance, crit, max_hp, max_hp, bot_type, ai_pattern, warrior_type)

    def _insert_bot_row(self, cursor, bot_tuple: Tuple[Any, ...]) -> None:
        cursor.execute(
            "INSERT OR IGNORE INTO bots "
            "(name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern, warrior_type) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            bot_tuple,
        )

    @staticmethod
    def _normalize_bot_dict(row_dict: Dict) -> Dict:
        d = dict(row_dict)
        if d.get("crit") is None:
            d["crit"] = PLAYER_START_CRIT
        # Этап 9: если warrior_type не задан или дефолтный (старый бот из БД
        # до миграции), назначаем стабильный псевдослучайный класс по bot_id —
        # чтобы в карточке боя соперник выглядел как живой игрок (Берсерк/Тень/Хаос).
        wt = d.get("warrior_type")
        if not wt or wt == "tank_0":
            bid = int(d.get("bot_id") or 0)
            if bid > 0:
                d["warrior_type"] = BOT_WARRIOR_TYPES[bid % len(BOT_WARRIOR_TYPES)]
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
