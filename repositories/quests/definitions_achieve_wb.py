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
        "tiers": [
            {"tier": 1, "target": 1,    "gold": 150,  "diamonds": 1,   "xp": 400},
            {"tier": 2, "target": 5,    "gold": 400,  "diamonds": 3,   "xp": 1200},
            {"tier": 3, "target": 10,   "gold": 800,  "diamonds": 6,   "xp": 2500},
            {"tier": 4, "target": 100,  "gold": 2500, "diamonds": 20,  "xp": 8000},
            {"tier": 5, "target": 1000, "gold": 8000, "diamonds": 100, "xp": 30000},
        ],
    },
]
