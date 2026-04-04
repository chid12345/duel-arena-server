"""
Конфигурация Duel Arena Bot
Портативный сервер для быстрых PvP боев
"""

import os

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
    get_table,
)

# Токен бота - установить через переменную окружения
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Публичный HTTPS URL Mini App (без завершающего слэша), например https://your-app.onrender.com
# Нужен для кнопки Web App в боте и регистрации в BotFather.
# Если WEBAPP_PUBLIC_URL не задан — подставляем типичные URL хостингов (чтобы кнопка не пропадала после деплоя).
def _webapp_public_url() -> str:
    u = (os.getenv("WEBAPP_PUBLIC_URL") or "").strip().rstrip("/")
    if u:
        return u
    render = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
    if render:
        return render
    fly = (os.getenv("FLY_APP_NAME") or "").strip()
    if fly:
        return f"https://{fly}.fly.dev"
    rwy = (os.getenv("RAILWAY_PUBLIC_DOMAIN") or "").strip().rstrip("/")
    if rwy:
        return rwy if rwy.startswith("http") else f"https://{rwy}"
    return ""


WEBAPP_PUBLIC_URL = _webapp_public_url()
ADMIN_USER_IDS = {
    int(user_id.strip())
    for user_id in os.getenv("ADMIN_USER_IDS", "").split(",")
    if user_id.strip().isdigit()
}

# База данных
# DATA_DIR — папка для постоянного хранения (Render Disk: /app/data).
# Если не задана — используем папку рядом с config.py (локальная разработка).
_DATA_DIR = os.getenv("DATA_DIR", os.path.dirname(os.path.abspath(__file__)))
DB_NAME   = os.path.join(_DATA_DIR, "duel_arena.db")

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
STAMINA_PER_FREE_STAT = 3


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
STREAK_BONUS_GOLD = 10

# --- Боевые формулы (сравнительные, как в combats.com) ---
# Уворот: def_agi / (def_agi + atk_agi) * DODGE_MAX_CHANCE
# Равные статы → 15%, большой перевес → до 24%
DODGE_MAX_CHANCE = 0.30

# Крит (Интуиция): atk_int / (atk_int + def_int) * CRIT_MAX_CHANCE
# Равные статы → 20%, большой перевес → до 33%
CRIT_MAX_CHANCE = 0.40

# Промах: случайный шанс не попасть вообще (не зависит от статов)
MISS_CHANCE = 0.05

# Частичный блок: атака попала не в ту зону, но вскользь — 70% урона
PARTIAL_BLOCK_CHANCE = 0.15

# Урон от Силы: base * (1 + strength * mult)
# Равные (11 силы): ~22 урона; специалист (20 силы): ~31 урон
STRENGTH_DAMAGE_BASE = 12
STRENGTH_DAMAGE_PCT_PER_POINT = 0.08

# Броня от Выносливости: % вложенных статов / (% + K), потолок ARMOR_MAX_REDUCTION
# Формула масштабируется на все 100 уровней (scale-invariant):
#   stamina_pct = vyn_invested / total_free_stats_at_level * 100
#   reduction = stamina_pct / (stamina_pct + K)
# K=75: 25% в вын → -25% урон, 50% → потолок -40%
ARMOR_STAMINA_K = 75.0
ARMOR_MAX_REDUCTION = 0.40


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
VICTORY_GOLD = 20
DEFEAT_GOLD = 0
DAILY_BONUS_GOLD = 20
ACTIVE_BONUS_GOLD = 50

# Уровни 1..MAX_LEVEL; пороги XP, апы, награды за ап — progression_100_levels_v4/progression.json
DEFEAT_EXP = 0
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

# Алмазы (премиум валюта)
DIAMONDS_DAILY_STREAK = 1
DIAMONDS_ACHIEVEMENT_BASE = 10
RESET_STATS_COST_DIAMONDS = 50  # 5x месячной подписки

# Реферальные награды (см. database.process_referral_*)
# N — порядковый номер приглашённого по факту первой оплаты подписки (Stars).
REFERRAL_PCT_SUB_RANK_1_10 = 5
REFERRAL_PCT_SUB_RANK_11_30 = 7
REFERRAL_PCT_SUB_RANK_31_PLUS = 10
REFERRAL_PCT_VIP_ALL_SHOP = 10  # с 31-го платящего: все покупки этого игрока в магазине и Stars-пакеты
# Цена подписки Premium в Telegram Stars (инвойс payload premium_sub)
PREMIUM_SUBSCRIPTION_STARS = 299
