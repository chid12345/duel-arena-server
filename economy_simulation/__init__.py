"""
economy_simulation/ — Monte Carlo симулятор экономики игрока.

В отличие от balance_simulation/ (только бои) — этот моделирует ДЕНЬ ИГРОКА:
ежедневные/недельные квесты, ачивки, стрик входа, бои, башня, премиум.

Источник правды: REWARD_TABLE, LOGIN_STREAK_SETS, ACHIEVEMENT_DEFS,
config/economy.json (anchor). Числа НЕ дублируются.

Использование:
    python tools/simulate_economy.py --profile f2p_endgame --days 30 -n 1000
"""
