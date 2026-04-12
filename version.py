"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.2.47"
VERSION_LABEL = "v1.2.47 — fix: Postgres-совместимый SQL в task_progress/claims/daily_quests"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "3.66"
