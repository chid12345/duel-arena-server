"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.8.74"
VERSION_LABEL = "v1.8.74 — fix: SQLite cache_size 32MB→1MB per thread (OOM fix for 512MB plan)"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "7.08"
