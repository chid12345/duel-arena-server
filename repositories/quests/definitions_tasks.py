"""Определения ежедневных, недельных заданий и стрика входа."""
from __future__ import annotations

# ── Ежедневные задания (сброс в 00:00) ────────────────────────────────────────
DAILY_QUEST_DEFS: list[dict] = [
    {
        "key": "dq_play1", "label": "⚔️ Первая кровь",
        "desc": "Провести 1 бой", "target": 1,
        "track": "battles", "difficulty": "easy", "frequency": "daily",
    },
    {
        "key": "dq_play5", "label": "⚔️ Боец дня",
        "desc": "Провести 5 боёв", "target": 5,
        "track": "battles", "difficulty": "medium", "frequency": "daily",
    },
    {
        "key": "dq_win3", "label": "🏆 Победитель",
        "desc": "Одержать 3 победы в PvP", "target": 3,
        "track": "pvp_wins", "difficulty": "medium", "frequency": "daily",
    },
    {
        "key": "dq_streak3", "label": "🔥 Серия",
        "desc": "Выиграть 3 боя подряд", "target": 3,
        "track": "streak", "difficulty": "hard", "frequency": "daily",
    },
    {
        "key": "dq_bot2", "label": "🤖 Охотник на ботов",
        "desc": "Победить 2 бота", "target": 2,
        "track": "bot_wins", "difficulty": "easy", "frequency": "daily",
    },
    {
        "key": "dq_buy1", "label": "🛍️ Покупка дня",
        "desc": "Купить 1 предмет в магазине", "target": 1,
        "track": "shop_buys", "difficulty": "easy", "frequency": "daily",
    },
    {
        "key": "dq_endless3", "label": "💀 Натиск дня",
        "desc": "3 победы в режиме Натиск", "target": 3,
        "track": "endless", "difficulty": "hard", "frequency": "daily",
    },
]

# ── Дополнительные недельные задания (к существующим 5) ───────────────────────
WEEKLY_EXTRA_DEFS: list[dict] = [
    {
        "key": "weekly_buy_gold_3",
        "label": "🛍️ Торговец недели",
        "desc": "Купить 3 предмета за золото в магазине за неделю.",
        "target": 3, "track": "wq_buy_gold",
        "difficulty": "easy", "frequency": "weekly",
    },
    {
        "key": "weekly_use_potions_10",
        "label": "🧪 Зельевар",
        "desc": "Использовать 10 эликсиров за неделю.",
        "target": 10, "track": "wq_use_potions",
        "difficulty": "medium", "frequency": "weekly",
    },
    {
        "key": "weekly_undefeated_5",
        "label": "🛡️ Несломленный",
        "desc": "Выиграть 5 боёв подряд (с ботами и игроками).",
        "target": 5, "track": "streak",
        "difficulty": "medium", "frequency": "weekly",
    },
    {
        "key": "weekly_spend_gold_500",
        "label": "💰 Щедрый воин",
        "desc": "Потратить 500 золота в магазине за неделю.",
        "target": 500, "track": "wq_spend_gold",
        "difficulty": "hard", "frequency": "weekly",
    },
]

# ── Наборы стрика входа (4 ротации: set 0, 1, 2, 3) ──────────────────────────
# item: str|None — ID предмета из магазина (добавляется в инвентарь)
LOGIN_STREAK_SETS: list[list[dict]] = [
    # Набор A (week_set % 4 == 0)
    [
        {"day": 1, "gold": 100, "diamonds": 0, "xp": 200, "item": None},
        {"day": 2, "gold": 0,   "diamonds": 1, "xp": 0,   "item": None},
        {"day": 3, "gold": 150, "diamonds": 0, "xp": 300, "item": "scroll_str_3"},
        {"day": 4, "gold": 200, "diamonds": 0, "xp": 0,   "item": None},
        {"day": 5, "gold": 0,   "diamonds": 2, "xp": 0,   "item": None},
        {"day": 6, "gold": 0,   "diamonds": 0, "xp": 500, "item": "box_common"},
        {"day": 7, "gold": 300, "diamonds": 3, "xp": 800, "item": "box_rare"},
    ],
    # Набор B (week_set % 4 == 1)
    [
        {"day": 1, "gold": 150, "diamonds": 0, "xp": 300, "item": None},
        {"day": 2, "gold": 0,   "diamonds": 0, "xp": 0,   "item": "scroll_end_3"},
        {"day": 3, "gold": 0,   "diamonds": 2, "xp": 0,   "item": None},
        {"day": 4, "gold": 0,   "diamonds": 0, "xp": 0,   "item": "xp_boost_5"},
        {"day": 5, "gold": 250, "diamonds": 0, "xp": 500, "item": None},
        {"day": 6, "gold": 0,   "diamonds": 3, "xp": 0,   "item": None},
        {"day": 7, "gold": 200, "diamonds": 2, "xp": 600, "item": "box_rare"},
    ],
    # Набор C (week_set % 4 == 2)
    [
        {"day": 1, "gold": 0,   "diamonds": 1, "xp": 0,   "item": None},
        {"day": 2, "gold": 200, "diamonds": 0, "xp": 400, "item": None},
        {"day": 3, "gold": 0,   "diamonds": 0, "xp": 0,   "item": "scroll_crit_3"},
        {"day": 4, "gold": 0,   "diamonds": 3, "xp": 0,   "item": None},
        {"day": 5, "gold": 0,   "diamonds": 0, "xp": 0,   "item": "scroll_armor_6"},
        {"day": 6, "gold": 350, "diamonds": 0, "xp": 700, "item": None},
        {"day": 7, "gold": 100, "diamonds": 5, "xp": 1000, "item": "box_rare"},
    ],
    # Набор D (week_set % 4 == 3)
    [
        {"day": 1, "gold": 0,   "diamonds": 0, "xp": 0,   "item": "scroll_hp_100"},
        {"day": 2, "gold": 150, "diamonds": 0, "xp": 300, "item": None},
        {"day": 3, "gold": 0,   "diamonds": 2, "xp": 0,   "item": None},
        {"day": 4, "gold": 0,   "diamonds": 0, "xp": 0,   "item": "scroll_str_3"},
        {"day": 5, "gold": 300, "diamonds": 0, "xp": 600, "item": None},
        {"day": 6, "gold": 0,   "diamonds": 4, "xp": 0,   "item": None},
        {"day": 7, "gold": 500, "diamonds": 0, "xp": 0,   "item": "box_rare"},
    ],
]
