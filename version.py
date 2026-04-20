"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.8.75"
VERSION_LABEL = "v1.8.75 — fix: PG pool keepalive+max_idle — SSL connection drop fix"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "7.09"
