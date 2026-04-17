"""Константы и формулы Мирового босса (см. docs/WORLD_BOSS.md).

Единственный источник правды для:
- расписания спавнов (часы UTC)
- длительности рейда
- формулы HP от онлайна
- списка 10 имён (рандом при спавне)
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

# Расписание: 6 спавнов/день каждые 4 часа (UTC).
WB_SPAWN_HOURS_UTC: tuple = (0, 4, 8, 12, 16, 20)

# Длительность одного рейда.
WB_DURATION_SEC: int = 10 * 60

# За сколько секунд до старта слать анонс в чат + пуш-напоминалку.
WB_ANNOUNCE_LEAD_SEC: int = 5 * 60

# Формула HP босса: max(min, per_online × онлайн).
WB_HP_PER_ONLINE: int = 500
WB_HP_MIN: int = 10_000

# "Онлайн" = активность за последние N минут (по players.last_active).
WB_ONLINE_WINDOW_MIN: int = 10

# 10 имён босса — рандом при спавне.
WB_BOSS_NAMES: List[str] = [
    "Гоблин-Король",
    "Ледяной Дракон",
    "Титан-Лич",
    "Огненный Колосс",
    "Каменный Голем",
    "Теневой Джинн",
    "Морской Кракен",
    "Небесный Феникс",
    "Проклятый Рыцарь",
    "Древний Страж",
]


def next_spawn_time_utc(now: datetime) -> datetime:
    """Возвращает ближайшее время следующего спавна (UTC), строго в будущем.
    Сейчас 03:47 → 04:00. Сейчас 04:00 → 08:00.
    """
    now = now.astimezone(timezone.utc) if now.tzinfo else now.replace(tzinfo=timezone.utc)
    today_slots = [
        now.replace(hour=h, minute=0, second=0, microsecond=0)
        for h in WB_SPAWN_HOURS_UTC
    ]
    future = [t for t in today_slots if t > now]
    if future:
        return future[0]
    # Завтра первый слот (00:00).
    tomorrow = now + timedelta(days=1)
    return tomorrow.replace(
        hour=WB_SPAWN_HOURS_UTC[0], minute=0, second=0, microsecond=0
    )


def calc_boss_hp(online: int) -> int:
    """HP босса от онлайна."""
    return max(WB_HP_MIN, WB_HP_PER_ONLINE * int(online))
