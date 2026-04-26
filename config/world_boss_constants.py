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
# ⚠️ ТЕСТ: временно 13:20 — вернуть (0,4,8,12,16,20) и MINUTE=0 после тестов
WB_SPAWN_HOURS_UTC: tuple = (13,)
WB_SPAWN_MINUTE_UTC: int = 20

# Длительность одного рейда.
WB_DURATION_SEC: int = 10 * 60

# За сколько секунд до старта слать анонс в чат + пуш-напоминалку.
WB_ANNOUNCE_LEAD_SEC: int = 5 * 60

# Окно подготовки перед стартом (WS шлёт wb_preparing, фронт показывает экран).
WB_PREP_SEC: int = 30

# Формула HP босса: max(min, per_online × онлайн).
WB_HP_PER_ONLINE: int = 500
WB_HP_MIN: int = 10_000

# "Онлайн" = активность за последние N минут (по players.last_active).
WB_ONLINE_WINDOW_MIN: int = 10

# Пороги коронных ударов (доля оставшегося HP → dmg%).
# Каждый срабатывает 1 раз за рейд (битовая маска crown_flags).
WB_CROWN_THRESHOLDS: tuple = (
    # (hp_pct, dmg_pct_of_max, flag_bit, label)
    (0.75, 0.03, 0b001, "75%"),
    (0.50, 0.05, 0b010, "50%"),
    (0.25, 0.08, 0b100, "25%"),  # + эффект "Хаос" 10с (на UI)
)

# Окно уязвимости босса: x3 урон от игроков, длится 5 сек, каждые 60 сек.
WB_VULN_WINDOW_SEC: int = 5
WB_VULN_INTERVAL_SEC: int = 60

# Фаза 2.3 — «ярость»: на 50% HP (одновременно с коронным ударом 50%)
# stat_profile умножается на этот множитель → следующие удары босса сильнее.
# Срабатывает 1 раз за рейд (атомарно по stage<2).
WB_ENRAGE_MULT: float = 1.2

# ── Награды ─────────────────────────────────────────────────
# ⚠️ ТЕСТ: каждому участнику плоско 50 золота (без contribution-множителя).
# Чтобы вернуть нормальный режим — поставить 1000 и убрать WB_TEST_FLAT_GOLD ниже.
WB_BASE_GOLD: int = 50
WB_BASE_EXP: int = 500
# Тестовый режим: плоско 50 золота каждому участнику (зарегистрированному ИЛИ ударившему).
# True = тестовый режим, False = пропорционально вкладу.
WB_TEST_FLAT_GOLD: bool = True
# Алмазы — фиксированный бонус только топ-3 и last-hit (не пропорционально вкладу).
WB_DIAMONDS_TOP1: int = 15
WB_DIAMONDS_TOP2: int = 10
WB_DIAMONDS_TOP3: int = 7
WB_DIAMONDS_LAST_HIT: int = 5
# Множители gold/exp от contribution.
WB_REWARD_MULT_VICTORY: float = 2.0
WB_REWARD_MULT_DEFEAT: float = 0.3
# Сундуки (chest_type в world_boss_rewards).
WB_CHEST_LAST_HIT: str = "wb_gold_chest"    # обычный (золотой)
WB_CHEST_TOP_DAMAGE: str = "wb_diamond_chest"  # редкий (алмазный)

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
    """Возвращает ближайшее время следующего спавна (UTC), строго в будущем."""
    now = now.astimezone(timezone.utc) if now.tzinfo else now.replace(tzinfo=timezone.utc)
    minute = globals().get("WB_SPAWN_MINUTE_UTC", 0)
    today_slots = [
        now.replace(hour=h, minute=minute, second=0, microsecond=0)
        for h in WB_SPAWN_HOURS_UTC
    ]
    future = [t for t in today_slots if t > now]
    if future:
        return future[0]
    tomorrow = now + timedelta(days=1)
    return tomorrow.replace(
        hour=WB_SPAWN_HOURS_UTC[0], minute=minute, second=0, microsecond=0
    )


def calc_boss_hp(online: int) -> int:
    """HP босса от онлайна."""
    return max(WB_HP_MIN, WB_HP_PER_ONLINE * int(online))


def is_vulnerability_window(elapsed_sec: float) -> bool:
    """Каждые 60 сек открывается окно x3 урона на 5 сек."""
    if elapsed_sec < 0:
        return False
    return int(elapsed_sec) % WB_VULN_INTERVAL_SEC < WB_VULN_WINDOW_SEC
