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
# Баланс 2026-06: было 500/10000 — толпа выносила мгновенно (1 игрок ~9000 урона
# за рейд, а босс рос всего на 500/чел). Подняли до 6000/чел, мин 15000 → рейд
# на 20 чел = 120к HP, реальный бой; соло почти не убить (нужна толпа).
WB_HP_PER_ONLINE: int = 6000
WB_HP_MIN: int = 15_000

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

# -- Награды: пул по вкладу -------------------------------------------
# Этап 2D редизайна: балансные числа (pool_base, contrib, проценты,
# алмазы топ-2/3, множители победа/поражение, шанс свитка) переехали
# в config/economy.json/world_boss. Читаются через economy.loader.get_world_boss.
# Здесь оставлено только не-балансное: ID сундука и имя dropping-предмета.
WB_CHEST_TOP_DAMAGE: str = "wb_diamond_chest"

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
