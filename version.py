"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.2.07"
VERSION_LABEL = "v1.2.07 — fix: postgres DDL для task_progress/task_claims/login_streak_v2"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "3.26"
