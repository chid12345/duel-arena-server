"""
reward_calculator.py — авторасчёт наград для квестов и испытаний.

Использование:
    from reward_calculator import calc_reward, quest_reward

    gold, diamonds = calc_reward(
        battles_needed=10,
        difficulty='medium',   # easy / medium / hard / epic
        frequency='weekly',    # daily / weekly / once
    )

Баланс (апрель 2026):
    - Игрок зарабатывает ~260 золота в день (DAILY_GOLD)
    - 1 алмаз = 40 золотых (DIAMOND_RATE)
    - Алмазы — только weekly/once и только medium+ сложность
"""

from __future__ import annotations

# ── Константы баланса ─────────────────────────────────────────────────────────

DAILY_GOLD   = 260   # суточный заработок активного игрока
DIAMOND_RATE = 40    # 1 💎 = 40 🪙  (меняй здесь — всё пересчитается)

# Средний доход за один бой (победы+поражения, ~65% win rate)
_GOLD_PER_BATTLE = 17

# Множители сложности
_DIFF_MULT = {
    'easy':   1.0,
    'medium': 1.4,
    'hard':   1.9,
    'epic':   2.8,
}

# Множители частоты (daily дешевле — игрок берёт каждый день)
_FREQ_MULT = {
    'daily':  0.70,
    'weekly': 1.00,
    'once':   1.40,
}

# Потолки золота (не ломать экономику)
_GOLD_CAP = {
    'daily':  65,    # ~25% дневного заработка
    'weekly': 200,   # ~75% дневного заработка
    'once':   800,   # ~3 дня — для крупных достижений
}

# Потолки алмазов по частоте
_DIAMOND_CAP = {
    'daily':  0,
    'weekly': 3,
    'once':   12,
}

# Минимальные сложности, при которых дают алмазы
_DIAMOND_MIN_DIFF = {'medium', 'hard', 'epic'}


# ── Основная функция ──────────────────────────────────────────────────────────

def calc_reward(
    battles_needed: int,
    difficulty: str,
    frequency: str,
) -> tuple[int, int]:
    """
    Рассчитать (gold, diamonds) для задания.

    Args:
        battles_needed: сколько боёв/побед нужно выполнить
        difficulty:     'easy' | 'medium' | 'hard' | 'epic'
        frequency:      'daily' | 'weekly' | 'once'

    Returns:
        (gold, diamonds) — оба int, округлены до 5
    """
    if difficulty not in _DIFF_MULT:
        raise ValueError(f"difficulty must be one of {list(_DIFF_MULT)}, got {difficulty!r}")
    if frequency not in _FREQ_MULT:
        raise ValueError(f"frequency must be one of {list(_FREQ_MULT)}, got {frequency!r}")

    base  = battles_needed * _GOLD_PER_BATTLE
    raw   = base * _DIFF_MULT[difficulty] * _FREQ_MULT[frequency]

    # Округлить до ближайшего кратного 5, применить потолок
    gold  = min(_GOLD_CAP[frequency], round(raw / 5) * 5)
    gold  = max(5, gold)   # минимум 5 золота

    # Алмазы считаются от RAW (до кэпа) — иначе epic == medium при cap 200
    diamonds = 0
    if frequency != 'daily' and difficulty in _DIAMOND_MIN_DIFF:
        raw_d    = (raw * 0.25) / DIAMOND_RATE   # 25% сырой ценности задания
        diamonds = max(1, round(raw_d))
        diamonds = min(_DIAMOND_CAP[frequency], diamonds)

    return gold, diamonds


# ── Хелпер для квестов ────────────────────────────────────────────────────────

def quest_reward(q: dict) -> dict:
    """
    Добавить 'reward_gold' и 'reward_diamonds' в словарь квеста.

    Квест должен содержать поля:
        battles_needed  int   — цель (кол-во боёв/побед)
        difficulty      str   — easy / medium / hard / epic
        frequency       str   — daily / weekly / once

    Возвращает тот же словарь с добавленными полями reward_gold / reward_diamonds.
    """
    gold, diamonds = calc_reward(
        battles_needed=int(q['battles_needed']),
        difficulty=q['difficulty'],
        frequency=q['frequency'],
    )
    return {**q, 'reward_gold': gold, 'reward_diamonds': diamonds}


# ── Справочник (для отладки и документации) ───────────────────────────────────

def reward_table() -> list[dict]:
    """Вернуть таблицу всех комбинаций для отладки."""
    rows = []
    for freq in ('daily', 'weekly', 'once'):
        for diff in ('easy', 'medium', 'hard', 'epic'):
            for battles in (3, 10, 25):
                g, d = calc_reward(battles, diff, freq)
                rows.append({
                    'frequency':       freq,
                    'difficulty':      diff,
                    'battles_needed':  battles,
                    'gold':            g,
                    'diamonds':        d,
                })
    return rows


if __name__ == '__main__':
    # Быстрая проверка: python reward_calculator.py
    print(f"{'freq':<8} {'diff':<8} {'battles':>7}  {'gold':>5}  {'dia':>3}")
    print('-' * 40)
    for r in reward_table():
        print(
            f"{r['frequency']:<8} {r['difficulty']:<8} {r['battles_needed']:>7}"
            f"  {r['gold']:>5}  {r['diamonds']:>3}"
        )
