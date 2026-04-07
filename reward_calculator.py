"""
reward_calculator.py — таблица наград для квестов и испытаний.

Использование:
    from reward_calculator import calc_reward

    gold, diamonds, xp = calc_reward('medium', 'weekly')  # → (160, 1, 500)

Баланс (апрель 2026):
    - Игрок зарабатывает ~260 золота в день
    - XP за победу в бою ~85; нужно 3–13 побед на уровень
    - 1 алмаз = 40 золотых
    - Алмазы: только weekly medium+ и once medium+
    - daily — никогда алмазов (повторяются каждый день)

Таблица:
    daily  easy   →  35 🪙  0 💎   80 ⭐  (~1 победа)
    daily  medium →  55 🪙  0 💎  150 ⭐  (~1.7 победы)
    daily  hard   →  65 🪙  0 💎  200 ⭐  (~2.3 победы)
    daily  epic   →  65 🪙  0 💎  200 ⭐
    weekly easy   → 120 🪙  0 💎  300 ⭐  (~3.5 победы)
    weekly medium → 160 🪙  1 💎  500 ⭐  (~6 побед)
    weekly hard   → 200 🪙  2 💎  700 ⭐  (~8 побед)
    weekly epic   → 200 🪙  3 💎  900 ⭐  (~10 побед)
    once   easy   → 250 🪙  0 💎  600 ⭐
    once   medium → 450 🪙  3 💎 1200 ⭐
    once   hard   → 650 🪙  6 💎 2000 ⭐
    once   epic   → 800 🪙 10 💎 3000 ⭐
"""

from __future__ import annotations

# ── Таблица наград (frequency, difficulty) → (gold, diamonds, xp) ─────────────

REWARD_TABLE: dict[tuple[str, str], tuple[int, int, int]] = {
    ('daily',  'easy')  : ( 35,  0,   80),
    ('daily',  'medium'): ( 55,  0,  150),
    ('daily',  'hard')  : ( 65,  0,  200),
    ('daily',  'epic')  : ( 65,  0,  200),
    ('weekly', 'easy')  : (120,  0,  300),
    ('weekly', 'medium'): (160,  1,  500),
    ('weekly', 'hard')  : (200,  2,  700),
    ('weekly', 'epic')  : (200,  3,  900),
    ('once',   'easy')  : (250,  0,  600),
    ('once',   'medium'): (450,  3, 1200),
    ('once',   'hard')  : (650,  6, 2000),
    ('once',   'epic')  : (800, 10, 3000),
}

_VALID_FREQ = ('daily', 'weekly', 'once')
_VALID_DIFF = ('easy', 'medium', 'hard', 'epic')


# ── Основная функция ──────────────────────────────────────────────────────────

def calc_reward(difficulty: str, frequency: str) -> tuple[int, int, int]:
    """
    Вернуть (gold, diamonds, xp) по таблице баланса.

    Args:
        difficulty:  'easy' | 'medium' | 'hard' | 'epic'
        frequency:   'daily' | 'weekly' | 'once'

    Returns:
        (gold, diamonds, xp)
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
    Добавить 'reward_gold', 'reward_diamonds', 'reward_xp' в словарь квеста.

    Квест должен содержать поля:
        difficulty  str  — easy / medium / hard / epic
        frequency   str  — daily / weekly / once
    """
    gold, diamonds, xp = calc_reward(q['difficulty'], q['frequency'])
    return {**q, 'reward_gold': gold, 'reward_diamonds': diamonds, 'reward_xp': xp}


# ── __main__ (отладка) ────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('%-8s %-8s  %5s  %3s  %5s' % ('freq', 'diff', 'gold', 'dia', 'xp'))
    print('-' * 40)
    for freq in _VALID_FREQ:
        for diff in _VALID_DIFF:
            g, d, xp = calc_reward(diff, freq)
            print('%-8s %-8s  %5d  %3d  %5d' % (freq, diff, g, d, xp))
