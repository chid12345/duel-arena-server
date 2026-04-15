"""БД, старт игрока, боевая математика (до total_free_stats / экономики)."""

import os
import sys

from progression_loader import hp_when_reaching_level

ADMIN_USER_IDS = {
    int(user_id.strip())
    for user_id in os.getenv("ADMIN_USER_IDS", "").split(",")
    if user_id.strip().isdigit()
}

# База данных
# Локально без DATABASE_URL: SQLite в файле (DATA_DIR или папка рядом с config.py).
# Продакшен на Render: только PostgreSQL (Supabase) — см. DATABASE_URL ниже.
_default_data_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
PARTIAL_BLOCK_DAMAGE_MULT = 0.30  # множитель урона при частичном блоке (вскользь)

# Классовые фишки (мягкие пассивки)
# Интуиция: редкий пробой полного блока критом (вероятность = crit_chance * CRIT_BLOCK_PIERCE_CHANCE)
CRIT_BLOCK_PIERCE_CHANCE = 0.10
# Пробой не должен быть сильнее «чистого» крита в открытую зону
CRIT_BLOCK_PIERCE_DAMAGE_MULT = 0.70

# Ловкость: шанс второго удара в тот же размен (чем больше вложений в ловкость, тем выше)
DODGE_DOUBLE_STRIKE_STEP = 25
DODGE_DOUBLE_STRIKE_PCT_PER_STEP = 0.01
DODGE_DOUBLE_STRIKE_MAX_CHANCE = 0.08
DODGE_DOUBLE_STRIKE_DAMAGE_MULT = 0.40

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

# Броня от Выносливости: идентичная структура формулы как у уворота/крита.
#   stamina_val / (stamina_val + avg_stamina) * ARMOR_ABSOLUTE_MAX
#   stamina_val = vyn + PLAYER_START_ENDURANCE (база, как у agi/intu)
#   avg_stamina = PLAYER_START_ENDURANCE + tf // 4 (как avg_agi/avg_intu)
#   Функция: armor_reduction(vyn, lv) в config/progression_fmt.py
ARMOR_ABSOLUTE_MAX     = 0.35   # жёсткий потолок стат-брони (35%). Пассивки/экипировка могут давать выше.

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


