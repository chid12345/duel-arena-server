"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.8.03"
VERSION_LABEL = "v1.8.03 — fix: DATE('now') PG + wb_debug endpoint + auto-poll 30s"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "6.37"
