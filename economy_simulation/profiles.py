"""Профили игроков для симуляции экономики.

Поля:
    level                 — стартовый уровень в начале симуляции
    battles_per_day       — (min, max) количество боёв в день
    winrate               — вероятность победы в одном бою [0..1]
    daily_quest_rate      — доля выполненных daily-квестов из 8 [0..1]
    weekly_quest_rate     — доля выполненных weekly-квестов из 4 [0..1]
    streak_login_rate     — вероятность залогиниться сегодня [0..1]
    ach_tiers_per_week    — среднее число клеймов тиров ачивок в неделю
    tower_rank            — постоянный ранк башни (None если не топ-10)
    premium               — True для донат-профиля (+25% gold/xp на бои)
    shop_buys_per_day     — для квеста dq_buy1 (1=всегда, 0=никогда)
    wb_hit_rate           — вероятность ударить WB сегодня
    name                  — человеческое имя профиля для отчёта
"""

from __future__ import annotations


PROFILES: dict[str, dict] = {
    "f2p_new": {
        "name": "F2P-новичок (lvl 5)",
        "level": 5,
        "battles_per_day": (3, 7),
        "winrate": 0.50,
        "daily_quest_rate": 0.50,
        "weekly_quest_rate": 0.10,
        "streak_login_rate": 0.75,
        "ach_tiers_per_week": 1.0,
        "tower_rank": None,
        "premium": False,
        "shop_buys_per_day": 0.3,
        "wb_hit_rate": 0.4,
    },
    "f2p_mid": {
        "name": "F2P-средний (lvl 40)",
        "level": 40,
        "battles_per_day": (8, 16),
        "winrate": 0.55,
        "daily_quest_rate": 0.85,
        "weekly_quest_rate": 0.60,
        "streak_login_rate": 0.90,
        "ach_tiers_per_week": 1.5,
        "tower_rank": 8,
        "premium": False,
        "shop_buys_per_day": 0.7,
        "wb_hit_rate": 0.85,
    },
    "f2p_endgame": {
        "name": "F2P-эндгейм (lvl 75)",
        "level": 75,
        "battles_per_day": (12, 22),
        "winrate": 0.60,
        "daily_quest_rate": 0.95,
        "weekly_quest_rate": 0.85,
        "streak_login_rate": 0.95,
        "ach_tiers_per_week": 1.0,
        "tower_rank": 3,
        "premium": False,
        "shop_buys_per_day": 0.9,
        "wb_hit_rate": 0.95,
    },
    "donate": {
        "name": "Донатер (lvl 40, премиум)",
        "level": 40,
        "battles_per_day": (10, 20),
        "winrate": 0.60,
        "daily_quest_rate": 0.95,
        "weekly_quest_rate": 0.80,
        "streak_login_rate": 0.95,
        "ach_tiers_per_week": 2.0,
        "tower_rank": 1,
        "premium": True,
        "shop_buys_per_day": 0.95,
        "wb_hit_rate": 0.95,
    },
}


def get_profile(key: str) -> dict:
    """Получить копию профиля по ключу. Бросает KeyError если нет."""
    if key not in PROFILES:
        raise KeyError(f"Неизвестный профиль: {key!r}. Доступно: {list(PROFILES.keys())}")
    return dict(PROFILES[key])


def list_profiles() -> list[str]:
    return list(PROFILES.keys())
