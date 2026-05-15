"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.20.23"
VERSION_LABEL = "v2.20.23 — tests: квесты v2 (16 тестов). Daily: dq_play1 после боя, claim 15g+40xp, дубль-блок, премиум +25% НЕ бустит квесты, неизвестный key=ok=False. Weekly: weekly_undefeated_5 читает task_progress а НЕ players.win_streak (фикс 337afd0), claim 100g+1d+280xp, track_purchase обновляет wq_buy/spend. Streak-login: первый день=1, тот же день не растёт, пропуск=сброс, claim day1/day7, ротация week_set 0→1, неверный день=ok=False. Всего 73/73."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.42"
