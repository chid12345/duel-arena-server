"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.6.41"
VERSION_LABEL = "v1.6.41 — fix: is_active BOOLEAN PostgreSQL — VALUES integer literal"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "4.75"
