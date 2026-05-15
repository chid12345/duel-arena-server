"""Достижения Мирового босса (WB = World Boss).

Отдельный модуль по Закону 9 (новая категория контента → новый дом).
compute = 'wb_wins' — считается в progress_mixin._computed_values через
db.get_wb_wins_count(user_id) (COUNT(world_boss_rewards WHERE is_victory=1)).
"""
from __future__ import annotations

WB_ACHIEVEMENT_DEFS: list[dict] = [
    {
        "key": "ach_wb_wins",
        "label": "🐉 Победитель рейдов",
        "desc": "Побед в рейдах Мирового босса",
        "source": "computed",
        "compute": "wb_wins",
        # legendary × 2.0 (мировой босс — пиковая активность)
        "tiers": [
            {"tier": 1, "target": 1,    "gold":  160, "diamonds":  0, "xp":  400},
            {"tier": 2, "target": 5,    "gold":  360, "diamonds":  2, "xp":  800},
            {"tier": 3, "target": 10,   "gold":  700, "diamonds":  6, "xp": 1400},
            {"tier": 4, "target": 100,  "gold": 2000, "diamonds": 16, "xp": 3200},
            {"tier": 5, "target": 1000, "gold": 7000, "diamonds": 60, "xp":10000},
        ],
    },
]
