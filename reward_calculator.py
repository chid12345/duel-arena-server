"""
reward_calculator.py — таблица наград для квестов и испытаний.

Использование:
    from reward_calculator import calc_reward

    gold, diamonds = calc_reward('medium', 'weekly')  # → (160, 1)

Баланс (апрель 2026):
    - Игрок зарабатывает ~260 золота в день
    - 1 алмаз = 40 золотых
    - Алмазы: только weekly medium+ и once medium+
    - daily квесты — никогда алмазов (повторяются каждый день)

Таблица:
    daily  easy   →  35 🪙  0 💎
    daily  medium →  55 🪙  0 💎
    daily  hard   →  65 🪙  0 💎
    daily  epic   →  65 🪙  0 💎
    weekly easy   → 120 🪙  0 💎
    weekly medium → 160 🪙  1 💎
    weekly hard   → 200 🪙  2 💎
    weekly epic   → 200 🪙  3 💎
    once   easy   → 250 🪙  0 💎
    once   medium → 450 🪙  3 💎
    once   hard   → 650 🪙  6 💎
    once   epic   → 800 🪙 10 💎
"""

from __future__ import annotations

# ── Таблица наград (frequency, difficulty) → (gold, diamonds) ─────────────────

REWARD_TABLE: dict[tuple[str, str], tuple[int, int]] = {
    ('daily',  'easy')  : ( 35,  0),
    ('daily',  'medium'): ( 55,  0),
    ('daily',  'hard')  : ( 65,  0),
    ('daily',  'epic')  : ( 65,  0),
    ('weekly', 'easy')  : (120,  0),
    ('weekly', 'medium'): (160,  1),
    ('weekly', 'hard')  : (200,  2),
    ('weekly', 'epic')  : (200,  3),
    ('once',   'easy')  : (250,  0),
    ('once',   'medium'): (450,  3),
    ('once',   'hard')  : (650,  6),
    ('once',   'epic')  : (800, 10),
}

_VALID_FREQ = ('daily', 'weekly', 'once')
_VALID_DIFF = ('easy', 'medium', 'hard', 'epic')


# ── Основная функция ──────────────────────────────────────────────────────────

def calc_reward(difficulty: str, frequency: str) -> tuple[int, int]:
    """
    Вернуть (gold, diamonds) по таблице баланса.

    Args:
        difficulty:  'easy' | 'medium' | 'hard' | 'epic'
        frequency:   'daily' | 'weekly' | 'once'

    Returns:
        (gold, diamonds)
    """
    key = (frequency, difficulty)
    if key not in REWARD_TABLE:
        raise ValueError(
            f"Неверная комбинация: frequency={frequency!r}, difficulty={difficulty!r}. "
            f"frequency: {_VALID_FREQ}, difficulty: {_VALID_DIFF}"
        )
    return REWARD_TABLE[key]


# ── Хелпер для квестов ────────────────────────────────────────────────────────

def quest_reward(q: dict) -> dict:
    """
    Добавить 'reward_gold' и 'reward_diamonds' в словарь квеста.

    Квест должен содержать поля:
        difficulty  str  — easy / medium / hard / epic
        frequency   str  — daily / weekly / once
    """
    gold, diamonds = calc_reward(q['difficulty'], q['frequency'])
    return {**q, 'reward_gold': gold, 'reward_diamonds': diamonds}


# ── __main__ (отладка) ────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('%-8s %-8s  %5s  %3s' % ('freq', 'diff', 'gold', 'dia'))
    print('-' * 32)
    for freq in _VALID_FREQ:
        for diff in _VALID_DIFF:
            g, d = calc_reward(diff, freq)
            print('%-8s %-8s  %5d  %3d' % (freq, diff, g, d))
