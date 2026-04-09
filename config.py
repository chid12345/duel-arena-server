"""
Конфигурация Duel Arena Bot
Портативный сервер для быстрых PvP боев
"""

import os
import sys

def _load_env_local():
    """Подхватить .env.local, если переменные не заданы в системе (удобно при запуске python main.py)."""
    path = os.path.join(os.path.dirname(__file__), ".env.local")
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key, value = key.strip(), value.strip()
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        pass

_load_env_local()

from progression_loader import (
    exp_needed_for_next_level,
    victory_xp_for_player_level,
    intermediate_ap_steps_for_level,
    max_level_from_table,
    gold_when_reaching_level,
    hp_when_reaching_level,
    stats_when_reaching_level,
    diamonds_when_reaching_level,
    get_table,
)

# Токен бота - установить через переменную окружения
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Игровая версия для UI (экран «Ещё»). При любом деплое с изменениями кода — +0.01 (1.06 → 1.07).
GAME_VERSION = "1.80"

# ── Система классов и инвентаря ──────────────────────────────────────────────

# Бесплатные классы (эксклюзивный выбор - только один)
FREE_CLASSES = {
    "tank_free": {
        "name": "Танк",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 5,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Броня +10%"
    },
    "agile_free": {
        "name": "Ловкач", 
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 5,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Уклонение +5%"
    },
    "crit_free": {
        "name": "Крит",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 5,
        "bonus_endurance": 5,
        "special_bonus": "Крит. урон +15%"
    },
    "universal_free": {
        "name": "Универсал",
        "price_gold": 0,
        "price_diamonds": 0,
        "bonus_strength": 2,
        "bonus_agility": 2,
        "bonus_intuition": 2,
        "bonus_endurance": 2,
        "special_bonus": "Все статы +1%"
    }
}

# Платные классы за золото
GOLD_CLASSES = {
    "berserker_gold": {
        "name": "Берсерк",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 8,
        "bonus_agility": 2,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Ярость: урон +20% при HP < 30%"
    },
    "assassin_gold": {
        "name": "Ассасин",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 2,
        "bonus_agility": 8,
        "bonus_intuition": 0,
        "bonus_endurance": 5,
        "special_bonus": "Скрытность: шанс двойного удара 10%"
    },
    "mage_gold": {
        "name": "Маг",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 0,
        "bonus_agility": 2,
        "bonus_intuition": 8,
        "bonus_endurance": 5,
        "special_bonus": "Магический щит: поглощает 15% урона"
    },
    "paladin_gold": {
        "name": "Паладин",
        "price_gold": 5000,
        "price_diamonds": 0,
        "bonus_strength": 5,
        "bonus_agility": 0,
        "bonus_intuition": 5,
        "bonus_endurance": 5,
        "special_bonus": "Святость: лечение 5% HP каждый раунд"
    }
}

# Платные классы за алмазы
DIAMONDS_CLASSES = {
    "dragonknight_diamonds": {
        "name": "Драконьий Рыцарь",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 10,
        "bonus_agility": 0,
        "bonus_intuition": 0,
        "bonus_endurance": 10,
        "special_bonus": "Дыхание дракона: огненный урон +25%"
    },
    "shadowdancer_diamonds": {
        "name": "Теневой Танцор",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 0,
        "bonus_agility": 10,
        "bonus_intuition": 5,
        "bonus_endurance": 5,
        "special_bonus": "Теневой клинок: игнорирует 20% брони"
    },
    "archmage_diamonds": {
        "name": "Архимаг",
        "price_gold": 0,
        "price_diamonds": 100,
        "bonus_strength": 0,
        "bonus_agility": 0,
        "bonus_intuition": 15,
        "bonus_endurance": 5,
        "special_bonus": "Магическая вспышка: шанс оглушить врага 15%"
    }
}

# USDT-образы (премиум)
USDT_CLASS_BASE = {
    "name": "Кастомный",
    "price_gold": 0,
    "price_diamonds": 0,
    "price_usdt": 10.0,  # $10 USDT
    "bonus_strength": 0,
    "bonus_agility": 0,
    "bonus_intuition": 0,
    "bonus_endurance": 5,
    "free_stats": 19,  # 19 свободных статов
    "special_bonus": "Сброс статов на 50% дешевле"
}

# Цены сброса статов
RESET_STATS_COST_DIAMONDS = 50  # обычная цена
RESET_STATS_COST_DIAMONDS_USDT = 25  # для владельцев USDT-образов

# Публичный HTTPS URL Mini App (без завершающего слэша), например https://your-app.onrender.com

# Публичный HTTPS URL Mini App (без завершающего слэша), например https://your-app.onrender.com
# Нужен для кнопки Web App в боте и регистрации в BotFather.
# Если WEBAPP_PUBLIC_URL не задан — подставляем типичные URL хостингов (чтобы кнопка не пропадала после деплоя).
def _webapp_public_url() -> str:
    u = (os.getenv("WEBAPP_PUBLIC_URL") or "").strip().rstrip("/")
    render_ext = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")

    if not u:
        if render_ext:
            u = render_ext
        else:
            fly = (os.getenv("FLY_APP_NAME") or "").strip()
            if fly:
                u = f"https://{fly}.fly.dev"
            else:
                rwy = (os.getenv("RAILWAY_PUBLIC_DOMAIN") or "").strip().rstrip("/")
                if rwy:
                    u = rwy if rwy.startswith("http") else f"https://{rwy}"
    elif render_ext:
        # Авто-коррекция: если WEBAPP_PUBLIC_URL указывает на другой хост (например, -2 сервис),
        # а сам сервис знает свой URL через RENDER_EXTERNAL_URL — используем собственный URL.
        u_base = u.split("?")[0]
        if u_base != render_ext:
            import logging as _log
            _log.getLogger(__name__).warning(
                "WEBAPP_PUBLIC_URL (%s) != RENDER_EXTERNAL_URL (%s) — using own service URL",
                u_base, render_ext,
            )
            u = render_ext

    # Всегда добавляем ?v=COMMIT, заменяя любой старый ?v= из env-var.
    # Используем GAME_VERSION + timestamp для гарантированного сброса кэша
    import time
    timestamp = str(int(time.time()))[-6:]  # Последние 6 цифр timestamp
    ver = (
        f"{GAME_VERSION}.{timestamp}"  # Версия + timestamp для уникальности
        or (os.getenv("WEBAPP_URL_VERSION") or "").strip()
        or (os.getenv("RENDER_GIT_COMMIT") or "").strip()[:8]
    )
    if u and ver:
        base = u.split("?")[0]
        u = f"{base}?v={ver}"
    return u or ""


WEBAPP_PUBLIC_URL = _webapp_public_url()
ADMIN_USER_IDS = {
    int(user_id.strip())
    for user_id in os.getenv("ADMIN_USER_IDS", "").split(",")
    if user_id.strip().isdigit()
}

# База данных
# Локально без DATABASE_URL: SQLite в файле (DATA_DIR или папка рядом с config.py).
# Продакшен на Render: только PostgreSQL (Supabase) — см. DATABASE_URL ниже.
_default_data_dir = os.path.dirname(os.path.abspath(__file__))
_env_data_dir = (os.getenv("DATA_DIR") or "").strip()
# Если в Environment остался DATA_DIR=/app/data без диска Render — каталога нет, SQLite падает.
if _env_data_dir and os.path.isdir(_env_data_dir):
    _DATA_DIR = os.path.abspath(_env_data_dir)
else:
    _DATA_DIR = _default_data_dir
    if _env_data_dir:
        print(
            f"DATA_DIR={_env_data_dir!r} не существует — SQLite будет в {_DATA_DIR!r}. "
            "Для Supabase задайте DATABASE_URL и удалите DATA_DIR из Environment.",
            file=sys.stderr,
            flush=True,
        )
DB_NAME = os.path.join(_DATA_DIR, "duel_arena.db")

# PostgreSQL (Supabase): полный URI. Если задан — используется вместо SQLite.
# У Supabase в настройках проекта скопируйте Connection string (URI), при необходимости добавьте ?sslmode=require
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()

# На Render без DATABASE_URL — старт блокируем: иначе SQLite на эфемерном диске, прогресс пропадёт при деплое.
_is_render = os.environ.get("RENDER", "").strip().lower() in ("1", "true", "yes")
if _is_render and not DATABASE_URL:
    raise RuntimeError(
        "На Render в Environment добавьте переменную DATABASE_URL (URI из Supabase → Database → Connection string). "
        "Удалите DATA_DIR, если он указывает на /app/data без подключённого диска."
    )

# Игровые константы (боты и «эталон» генерации; старт игрока — PLAYER_START_*)
BASE_STRENGTH = 10
BASE_ENDURANCE = 10
BASE_HP = 100
# Стартовый персонаж (уровень 1 в UI; уровни 1…MAX_LEVEL)
PLAYER_START_LEVEL = 1
PLAYER_START_STRENGTH = 3
PLAYER_START_ENDURANCE = 3
PLAYER_START_CRIT = 3
PLAYER_START_MAX_HP = 60
PLAYER_START_FREE_STATS = 5

# Боты / синтетика: шаг авто-HP по уровню (не путать с таблицей игрока progression.json)
LEVEL_UP_HP_BASE = 10
LEVEL_UP_AUTO_HP = 1
# Ручное вложение свободного стата в выносливость: +STAMINA_PER_FREE_STAT к max и current
STAMINA_PER_FREE_STAT = 2


def expected_max_hp_from_level(level: int) -> int:
    """Ожидаемый max_hp только от старта и ап уровней по таблице (без ручных вложений в выносливость)."""
    lv = max(1, int(level))
    s = PLAYER_START_MAX_HP
    # hp_when_reaching_level(L) начисляется при переходе на уровень L (L>=2), не при «ур.1» в таблице.
    for L in range(2, lv + 1):
        s += hp_when_reaching_level(L)
    return s


def stamina_stats_invested(max_hp: int, level: int) -> int:
    """Сколько раз вложили свободный стат в выносливость (каждый раз +STAMINA_PER_FREE_STAT к max_hp)."""
    base = expected_max_hp_from_level(level)
    extra = max(0, int(max_hp) - base)
    step = int(STAMINA_PER_FREE_STAT)
    if step <= 0:
        return 0
    return extra // step


# Первые N завершённых боёв (победа или поражение) — бот ослаблен (статы и HP × ONBOARDING_BOT_STAT_MULT)
ONBOARDING_BATTLES_EASY = 3
ONBOARDING_BOT_STAT_MULT = 0.6  # «слабее на 40%» относительно обычного бота
DISPLAY_NAME_MAX_LEN = 18

# Подбор бота: кольца ±0, ±1, ±2… от центра; вес w = 1/(1 + K·d²), d = |ур.бота − центр|
# Максимум ±2 уровня — бот сильно выше/ниже не придёт при узком центре
BOT_MATCH_LEVEL_RANGE_MAX = 2
BOT_MATCH_LEVEL_STRICTNESS = 3000.0  # очень высокий K → почти всегда бот вашего уровня

# Боевая система
BATTLE_TIMEOUT_SECONDS = 5
# Время на полный ход (атака+защита); по истечении — пропуск, удар по вам без блока
TURN_ACTION_SECONDS = 15
TURN_LIMIT_SECONDS = 15  # отображение таймера (синхрон с TURN_ACTION_SECONDS)
AFK_ROUNDS_TO_DEFEAT = 3  # подряд пропусков хода без ответа — поражение
# Бонус за серию побед подряд (каждые N побед — доп. золото)
STREAK_BONUS_EVERY = 5
STREAK_BONUS_GOLD = 30

# --- Боевые формулы (сравнительные, как в combats.com) ---
# Уворот: def_agi / (def_agi + atk_agi) * DODGE_MAX_CHANCE
# Равные статы → 12.5%, большой перевес → до 20%
DODGE_MAX_CHANCE = 0.25

# Крит (Интуиция): atk_int / (atk_int + def_int) * CRIT_MAX_CHANCE
# Равные статы → 15%, большой перевес → до 25%
CRIT_MAX_CHANCE = 0.30

# Промах: случайный шанс не попасть вообще (не зависит от статов)
MISS_CHANCE = 0.05

# Частичный блок: атака попала не в ту зону, но вскользь — 70% урона
PARTIAL_BLOCK_CHANCE = 0.15

# Классовые фишки (мягкие пассивки)
# Интуиция: редкий пробой полного блока критом (вероятность = crit_chance * CRIT_BLOCK_PIERCE_CHANCE)
CRIT_BLOCK_PIERCE_CHANCE = 0.10
# Пробой не должен быть сильнее «чистого» крита в открытую зону
CRIT_BLOCK_PIERCE_DAMAGE_MULT = 0.70

# Ловкость: шанс второго удара в тот же размен (чем больше вложений в ловкость, тем выше)
DODGE_DOUBLE_STRIKE_STEP = 25
DODGE_DOUBLE_STRIKE_PCT_PER_STEP = 0.01
DODGE_DOUBLE_STRIKE_MAX_CHANCE = 0.12
DODGE_DOUBLE_STRIKE_DAMAGE_MULT = 0.60

# Выносливость/танк: шанс «поглощения» — входящий урон режется вдвое.
TANK_GUARD_STEP = 25
TANK_GUARD_PCT_PER_STEP = 0.01
TANK_GUARD_MAX_CHANCE = 0.12
TANK_GUARD_DAMAGE_MULT = 0.50

# Силовой танк (сила + HP): редкая «абсолютная стойка» — любой входящий удар = 1 урон.
# Баланс: очень маленький шанс, чтобы не превращать бои в лотерею.
FORTRESS_GUARD_STEP = 120
FORTRESS_GUARD_PCT_PER_STEP = 0.005
FORTRESS_GUARD_MAX_CHANCE = 0.03

# Сила: «пролом брони» — шанс частично игнорировать броню цели на удар.
STRENGTH_ARMOR_BREAK_STEP = 25
STRENGTH_ARMOR_BREAK_PCT_PER_STEP = 0.01
STRENGTH_ARMOR_BREAK_MAX_CHANCE = 0.12
STRENGTH_ARMOR_BREAK_IGNORE_PCT = 0.25

# Урон от Силы: убывающая отдача через степенную формулу
#   raw_dmg = FLAT_PER_LEVEL * level + SCALE * strength^POWER
#   normal_cap = defender.max_hp * MAX_PCT  (крит может превысить кап)
#
# Примеры (зеркальный бой, сбалансированный билд):
#   Ур.1  (str≈5):   ~17 урона/раунд, бой ≈6 раундов
#   Ур.50 (str≈250): ~220 урона/раунд, бой ≈7 раундов
#   Ур.100(str≈540): ~460 урона/раунд, бой ≈8 раундов
#   Ур.100 full-STR: ~490 урона/раунд, кап 45% HP → бой ≈3–4 раунда (стекло)
STRENGTH_DAMAGE_FLAT_PER_LEVEL = 0.3    # плоский бонус ×уровень (lv100 = +30)
STRENGTH_DAMAGE_SCALE = 4.0             # коэффициент при степени
STRENGTH_DAMAGE_POWER = 0.75            # показатель степени (убывающая отдача)
STRENGTH_DAMAGE_MAX_PCT = 0.45          # кап обычного удара = 45% от макс. HP защитника

# Броня от Выносливости: абсолютная формула (не процент от пула!)
#   stamina_invested = фактическое кол-во вложений в выносливость
#   base = stamina_invested / (stamina_invested + ARMOR_STAMINA_K_ABS)
#   level_cap = min(ARMOR_ABSOLUTE_MAX, ARMOR_CAP_BASE + ARMOR_CAP_PER_LEVEL * lv)
#   reduction = min(level_cap, base)
#
# Прогрессия для heavy-tank билда (80% статов в вын):
#   Ур.3 → ~2%  | Ур.10 → ~6%  | Ур.25 → ~15%
#   Ур.50 → ~25% | Ур.75 → ~35% | Ур.100 → 45% (потолок)
# Броня НИКОГДА не бьёт потолок раньше ~ур.100 при тяжёлом вложении.
ARMOR_STAMINA_K_ABS    = 600    # абсолютный K (не процентный)
ARMOR_CAP_BASE         = 0.05   # базовый потолок брони (5% на ур.0)
ARMOR_CAP_PER_LEVEL    = 0.004  # +0.4% потолка за каждый уровень
ARMOR_ABSOLUTE_MAX     = 0.45   # жёсткий потолок (45% на ур.100)

# Лимит раундов — предотвращение бесконечных боёв (тенк vs тенк)
# При достижении лимита побеждает тот, у кого больше HP.
MAX_BATTLE_ROUNDS = 30

# Абсолютный бонус к уклону за каждые N вложенных очков в Ловкость
# Сбалансированный билд: +0% (ур.1) → +5% (ур.100) сверх сравнительной формулы
# Full-AGI специалист: достигает потолка DODGE_MAX_CHANCE к ~ур.50
AGI_BONUS_STEP = 25           # каждые 25 вложенных очков
AGI_BONUS_PCT_PER_STEP = 0.005  # +0.5% за веху

# Абсолютный бонус к крит-шансу за каждые N вложенных очков в Интуицию
INT_BONUS_STEP = 25
INT_BONUS_PCT_PER_STEP = 0.005  # +0.5% за веху

# Зональные множители урона (как в combats.com)
# Голова: +30% урона, высокий риск/награда — враг защищается головой → блок
# Ноги:   −25% урона + дебафф: −ZONE_LEGS_DODGE_PENALTY к уклону жертвы в следующем раунде
ZONE_HEAD_MULT = 1.3            # ×1.3 урона при ударе в голову
ZONE_LEGS_MULT = 0.75           # ×0.75 урона при ударе в ноги
ZONE_LEGS_DODGE_PENALTY = 0.15  # −15% шанс уклона у жертвы следующий раунд


def total_free_stats_at_level(level: int) -> int:
    """Суммарное кол-во свободных статов которое имеет игрок к данному уровню."""
    from progression_loader import stats_when_reaching_level, intermediate_ap_steps_for_level
    lv = max(1, int(level))
    total = PLAYER_START_FREE_STATS
    for l in range(1, lv + 1):
        total += stats_when_reaching_level(l)
        if l < lv:
            total += intermediate_ap_steps_for_level(l)
    return max(1, total)

# Экономика
VICTORY_GOLD = 25
DEFEAT_GOLD = 5   # небольшое утешение — не демотивирует новичков
DAILY_BONUS_GOLD = 40
ACTIVE_BONUS_GOLD = 80

# Уровни 1..MAX_LEVEL; пороги XP, апы, награды за ап — progression_100_levels_v4/progression.json
DEFEAT_EXP = 0
# XP за поражение: доля от гипотетического XP «как за победу» (тот же уровень, множитель разницы уровней, урон по max_hp победителя); золото не начисляется
DEFEAT_XP_AS_WIN_FRACTION = 0.10
# Premium: бонус к XP за бой (победа и поражение), после зелья ×1.5 из магазина
PREMIUM_XP_BONUS_PERCENT = 30
PREMIUM_XP_MULTIPLIER = 1.0 + PREMIUM_XP_BONUS_PERCENT / 100.0
MAX_LEVEL = max_level_from_table()


def _xp_bar(exp: int, need: int, steps: int = 0, width: int = 14) -> str:
    """Визуальная полоска опыта с разделителями на позициях промежуточных апов."""
    if need <= 0:
        return "█" * width
    if steps < 1:
        steps = 1
    # Позиции разделителей: thr = (need*k)//(steps+1), как в battle_system при апе по XP
    markers: set[int] = set()
    for k in range(1, steps + 1):
        thr = (need * k) // (steps + 1)
        col = int(thr / need * width)
        col = max(1, min(width - 1, col))
        markers.add(col)
    filled = min(width, int(exp / need * width))
    result = []
    for i in range(width):
        if i in markers:
            result.append("│")
        elif i < filled:
            result.append("█")
        else:
            result.append("░")
    return "".join(result)


def format_exp_progress(exp: int, level: int) -> str:
    """Строка опыта: полоска и текущий/нужно. HTML."""
    lv = int(level)
    need = exp_needed_for_next_level(lv)
    if need <= 0 or lv >= MAX_LEVEL:
        return "<code>██████████████</code> макс."
    e = int(exp)
    steps = int(intermediate_ap_steps_for_level(lv))
    if steps < 1:
        steps = 1
    bar = _xp_bar(e, need, steps=steps)
    return f"<code>[{bar}]</code> {e}/{need}"

# Улучшения
IMPROVEMENT_LEVELS = 5
IMPROVEMENT_COST_MULTIPLIER = 1.5

# Боты: целевая численность по уровням (дополняется при старте БД до этих значений).
# Ур.1 — меньше плотность; ур.2–10 — по 100 для тестов матчмейка; все боты с разными сборками (рандом внутри уровня).
BOT_COUNT_BY_LEVEL = {
    1: 50,
    2: 100,
    3: 100,
    4: 100,
    5: 100,
    6: 100,
    7: 100,
    8: 100,
    9: 100,
    10: 100,
}
# Дополнительно: столько ботов с уровнями 11..MAX_LEVEL (случайное распределение вверх по диапазонам).
BOT_EXTRA_POPULATION_ABOVE_10 = 0

TARGET_BOT_POPULATION = sum(BOT_COUNT_BY_LEVEL.values()) + BOT_EXTRA_POPULATION_ABOVE_10
INITIAL_BOTS_COUNT = TARGET_BOT_POPULATION  # совместимость со старыми упоминаниями
BOT_NAMES = [
    "Алекс", "Макс", "Тим", "Рекс", "Дрейк", "Крис", "Шторм", "Вольф", 
    "Омега", "Хантер", "Легион", "Разрушитель", "Титан", "Альфа"
]

BOT_PREFIXES = {
    "novice": ["Новичок", "Боец", "Рекрут"],
    "warrior": ["Гладиатор", "Воин", "Ас"],
    "master": ["Чемпион", "Мастер", "Легенда"],
    "legend": ["Титан", "Бессмертный", "Альфа"]
}

# Зоны атаки/защиты
ATTACK_ZONES = ["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"]

# Сообщения
MESSAGES = {
    'welcome': '⚔️ <b>Добро пожаловать в Дуэль-Арену!</b> ⚔️',
    'victory': '🎉 **Победа!**',
    'defeat': '💀 **Поражение!**',
    'level_up': '🎊 **Новый уровень: {level}!**',
    'afk_warning': '⚠️ Пропуск хода! Следующий пропуск может стоить победы!',
    'afk_final_warning': '🚨 Последнее предупреждение! Еще один пропуск - поражение!',
    'afk_defeat': '💀 Поражение по техническим причинам!'
}

# Эмодзи (endurance в БД = ловкость в UI)
EMOJI = {
    'strength': '💪',
    'endurance': '🤸',
    'hp': '❤️',
    'gold': '💰',
    'exp': '⭐',
    'level': '📊',
    'attack': '👊',
    'defense': '🛡️',
    'intuition': '💥',
    'miss': '❌',
    'dodge': '💨',
    'block': '🛡️',
    'partial_block': '🔹'
}

# HP реген (time-based, вне боя)
HP_REGEN_BASE_SECONDS = 300       # 5 минут — полный реген без вложений в выносливость
HP_REGEN_ENDURANCE_BONUS = 0.05   # +5% скорости за каждое вложение свободного стата в выносливость
HP_MIN_BATTLE_PCT = 0.30          # нельзя начать бой если текущий HP < 30% от макс.

# CryptoPay (https://t.me/CryptoBot)
# Дефолт = тестовый токен (@CryptoTestnetBot). Боевой прописать в CRYPTOPAY_TOKEN на Render.
CRYPTOPAY_TOKEN = os.getenv("CRYPTOPAY_TOKEN", "56515:AAThe6SQhjz10EDpboEUulYqaaQKo47xFLF")
# 1 = тестовая сеть, 0 = боевая. Менять вместе с токеном.
CRYPTOPAY_TESTNET = os.getenv("CRYPTOPAY_TESTNET", "1") == "1"
# Полный сброс аккаунта через CryptoPay Mini App (только USDT)
FULL_RESET_CRYPTO_USDT = (os.getenv("FULL_RESET_CRYPTO_USDT") or "11.99").strip()

# Алмазы (премиум валюта)
DIAMONDS_DAILY_STREAK = 2
DIAMONDS_ACHIEVEMENT_BASE = 10

# Реферальные награды (см. database.process_referral_*)
# N — порядковый номер приглашённого по факту первой оплаты подписки (Stars).
REFERRAL_PCT_SUB_RANK_1_10 = 5
REFERRAL_PCT_SUB_RANK_11_30 = 7
REFERRAL_PCT_SUB_RANK_31_PLUS = 10
REFERRAL_PCT_VIP_ALL_SHOP = 10  # с 31-го платящего: все покупки этого игрока в магазине и Stars-пакеты
# Цена подписки Premium в Telegram Stars (инвойс payload premium_sub)
PREMIUM_SUBSCRIPTION_STARS = 390

# Образы (классы): масштабирование бонусов к базовым статам.
# Раз в N уровней образ усиливается на +1 к основным статам (с потолком),
# чтобы бонусы не теряли смысл на 50+ уровнях.
AVATAR_SCALE_EVERY_LEVELS = 20
AVATAR_SCALE_MAX_BONUS = 3

# Элитный образ продается за Stars/USDT.
ELITE_AVATAR_ID = "elite_emperor"
ELITE_AVATAR_STARS = 590
ELITE_AVATAR_USDT = "11.99"

# Каталог образов.
# В проекте "agility" соответствует endurance, "intuition" соответствует crit.
AVATAR_CATALOG = [
    {"id": "base_tank", "name": "🛡️ Страж Бастиона", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 5, "endurance": 5, "crit": 0, "hp_flat": 0, "badge": "🛡️", "description": "Танк: +5 Сила и +5 Выносливость."},
    {"id": "base_rogue", "name": "🌪️ Теневой Ловкач", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 0, "endurance": 5, "crit": 0, "hp_flat": 0, "badge": "🌪️", "description": "Ловкач: +5 Ловкость и +5 Выносливость."},
    {"id": "base_crit", "name": "⚡ Охотник Критов", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 0, "endurance": 5, "crit": 5, "hp_flat": 0, "badge": "⚡", "description": "Критовик: +5 Интуиция и +5 Выносливость."},
    {"id": "base_neutral", "name": "🎯 Универсал", "tier": "base", "rarity": "common", "currency": "free", "price": 0, "strength": 2, "endurance": 2, "crit": 2, "hp_flat": 4, "badge": "🎯", "description": "Нейтральный: +2 ко всем 4 статам (Сила/Ловкость/Интуиция/Выносливость)."},

    {"id": "gold_vanguard", "name": "🛡️ Железный Авангард", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 6, "endurance": 8, "crit": 0, "hp_flat": 12, "badge": "🛡️", "description": "Mid-tier танк: лучше базы, но без имбы."},
    {"id": "gold_blade", "name": "🗡️ Танцор Клинка", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 3, "endurance": 8, "crit": 3, "hp_flat": 6, "badge": "🗡️", "description": "Mid-tier дуэлянт: темп и точность."},
    {"id": "gold_hunter", "name": "🎯 Охотник за Слабостями", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4200, "strength": 5, "endurance": 4, "crit": 6, "hp_flat": 4, "badge": "🎯", "description": "Mid-tier крит-давление."},
    {"id": "gold_tactician", "name": "📘 Полевой Тактик", "tier": "gold", "rarity": "rare", "currency": "gold", "price": 4600, "strength": 4, "endurance": 4, "crit": 4, "hp_flat": 8, "badge": "📘", "description": "Гибкий mid-tier образ."},

    {"id": "dia_duelist", "name": "💎 Кровавый Дуэлянт", "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 220, "strength": 6, "endurance": 3, "crit": 7, "hp_flat": 4, "badge": "💎", "description": "Премиум: высокий риск/урон."},
    {"id": "dia_fortress", "name": "💎 Стальная Крепость", "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 220, "strength": 4, "endurance": 9, "crit": 2, "hp_flat": 14, "badge": "💎", "description": "Премиум: максимальная стойкость."},
    {"id": "dia_phantom", "name": "💎 Призрачный Шаг", "tier": "diamond", "rarity": "epic", "currency": "diamonds", "price": 240, "strength": 4, "endurance": 7, "crit": 5, "hp_flat": 6, "badge": "💎", "description": "Премиум: контроль темпа и точность."},

    {"id": "elite_emperor", "name": "👑 Император Арены", "tier": "elite", "rarity": "legendary", "currency": "usdt_stars", "price": 0, "strength": 8, "endurance": 8, "crit": 8, "hp_flat": 18, "badge": "👑", "description": "Элитный образ с максимальным статусом и визуальным выделением."},
]
