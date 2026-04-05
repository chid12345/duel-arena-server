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

# PostgreSQL (Supabase и т.п.): полный URL. Если задан — используется вместо SQLite.
# Рекомендуется добавлять ?sslmode=require к URL Supabase.
DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()

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
STREAK_BONUS_GOLD = 10

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
VICTORY_GOLD = 20
DEFEAT_GOLD = 0
DAILY_BONUS_GOLD = 20
ACTIVE_BONUS_GOLD = 50

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
FULL_RESET_CRYPTO_USDT = (os.getenv("FULL_RESET_CRYPTO_USDT") or "7.50").strip()

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
