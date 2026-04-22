"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.9.71"
VERSION_LABEL = "v1.9.71 — fix: bot retry loop survives Telegram Conflict (zero-downtime deploy)"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "8.05"
