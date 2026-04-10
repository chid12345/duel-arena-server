"""Пороги XP, полоска опыта, MAX_LEVEL."""

from progression_loader import (
    exp_needed_for_next_level,
    intermediate_ap_steps_for_level,
    max_level_from_table,
    stats_when_reaching_level,
)

from config.battle_constants import (
    ARMOR_ABSOLUTE_MAX,
    ARMOR_CAP_BASE,
    ARMOR_CAP_PER_LEVEL,
    PLAYER_START_ENDURANCE,
    PLAYER_START_FREE_STATS,
)


def armor_reduction(vyn: int, level: int) -> float:
    """Броня — та же сравнительная формула, что у уворота и крита.
    vyn = stamina_stats_invested (вложения сверх базы).
    Возвращает долю снижения урона 0.0–ARMOR_ABSOLUTE_MAX.
    """
    lv = max(1, int(level))
    stamina_val = int(vyn) + PLAYER_START_ENDURANCE
    tf = total_free_stats_at_level(lv)
    avg_stamina = max(1, PLAYER_START_ENDURANCE + tf // 4)
    base = stamina_val / (stamina_val + avg_stamina) * ARMOR_ABSOLUTE_MAX
    cap = min(ARMOR_ABSOLUTE_MAX, ARMOR_CAP_BASE + ARMOR_CAP_PER_LEVEL * lv)
    return min(cap, base)


def total_free_stats_at_level(level: int) -> int:
    """Суммарное кол-во свободных статов которое имеет игрок к данному уровню."""
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

