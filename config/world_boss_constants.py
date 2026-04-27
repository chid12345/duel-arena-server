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

# ── РАСПИСАНИЕ ──
# Тестовый режим: каждые 20 минут (слоты :00, :20, :40 каждого часа).
# 72 рейда/день. Если WB_SPAWN_INTERVAL_MIN > 0 — используется он,
# иначе фолбек на старый список часов WB_SPAWN_HOURS_UTC.
WB_SPAWN_INTERVAL_MIN: int = 20

# Legacy / резервное расписание (не используется когда INTERVAL > 0).
# Оригинал прода: каждые 4 часа: (0, 4, 8, 12, 16, 20) MINUTE=0
WB_SPAWN_HOURS_UTC: tuple = (0, 4, 8, 12, 16, 20)
WB_SPAWN_MINUTE_UTC: int = 0

# Длительность одного рейда.
WB_DURATION_SEC: int = 10 * 60

# Окно входа в активный рейд: первые 2 минуты после старта.
# С 2-й по 10-ю минуту дверь закрыта — новые игроки не могут зайти.
# Анти-эксплойт «жду пока корона 50/25% сработает, потом захожу с
# полным HP и забираю награду» — запретили вход после 2 мин.
# Уже подключившиеся продолжают бить до конца рейда.
WB_LATE_JOIN_WINDOW_SEC: int = 2 * 60

# За сколько секунд до старта слать анонс в чат + пуш-напоминалку.
WB_ANNOUNCE_LEAD_SEC: int = 5 * 60

# Окно подготовки перед стартом. 0 = выключено (нет отдельного экрана).
# Игрок видит обычное лобби с таймером до самого старта рейда.
WB_PREP_SEC: int = 0

# Окно «комнаты ожидания» — за N секунд до старта рейда в лобби открывается
# кнопка «⚔ ВОЙТИ В БОЙ». Тапнул → попал в комнату ожидания (отдельный экран
# с таймером и списком всех кто зашёл). Когда таймер 0:00 — все в бою.
WB_GATHER_OPEN_SEC: int = 5 * 60

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

# ── Награды (Вариант Б: гарантия + пул по вкладу) ───────────
# ЗОЛОТО:
#   guaranteed = 30 (фикс за регистрацию ИЛИ участие в бою)
#   pool       = 50 × N_участников  (распределяется по вкладу в урон)
#   итого игроку: (30 + pool × вклад%) × mult(победа/поражение)
WB_GOLD_GUARANTEED: int = 30
WB_GOLD_CONTRIB_PER_PLAYER: int = 50
# ОПЫТ:
#   База = victory_xp_for_player_level(уровень) — то же что и за победу 1v1.
#   guaranteed = база × 0.3 (за регистрацию)
#   contrib    = база × 3.0 × вклад% (если бил)
#   итого: (guaranteed + contrib) × mult
WB_XP_GUARANTEED_PCT: float = 0.3
WB_XP_CONTRIB_MULT: float = 3.0

# Старые константы (оставляем для совместимости — больше не используются в формуле).
WB_BASE_GOLD: int = 50  # legacy
WB_BASE_EXP: int = 500  # legacy
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
    """Возвращает ближайшее время следующего спавна (UTC), строго в будущем.

    Если задан WB_SPAWN_INTERVAL_MIN > 0 — расписание кратное N минутам
    от 00:00 (например, 10 мин → :00, :10, :20, :30, :40, :50).
    Иначе — старый список фиксированных часов WB_SPAWN_HOURS_UTC.
    """
    now = now.astimezone(timezone.utc) if now.tzinfo else now.replace(tzinfo=timezone.utc)
    interval = globals().get("WB_SPAWN_INTERVAL_MIN", 0)
    if interval and interval > 0:
        # Округляем «вверх» до ближайшего интервала; «+1» гарантирует строгое future
        cur_min_of_day = now.hour * 60 + now.minute
        next_total = (cur_min_of_day // interval + 1) * interval
        day_total = 24 * 60
        if next_total >= day_total:
            base = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            return base + timedelta(minutes=next_total - day_total)
        base = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return base + timedelta(minutes=next_total)
    # Legacy: фиксированные часы + одна минута
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
