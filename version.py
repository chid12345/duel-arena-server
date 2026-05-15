"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.05"
VERSION_LABEL = "v2.21.05 — Balance Этап 2D: WB-балансные константы в economy.json. Новая секция world_boss: pool_base 500, gold_contrib_per_player 50, xp_guaranteed_pct 0.3, xp_contrib_mult 3.0, diamonds_top2 10, diamonds_top3 5, reward_mult_victory 2.0, reward_mult_defeat 0.3, victory_scroll_drop_chance 0.05. Из config/world_boss_constants.py удалены — там осталась только механика (расписание/имена/HP). repositories/world_boss/rewards_calc.py и test_world_boss.py обновлены. +6 тестов. 130/131 зелёных (1 флак был и до меня)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.56"
