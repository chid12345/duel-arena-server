"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.1.18"
VERSION_LABEL = "v1.1.18 — fix: rate limiter for battle_choice raised to 35/60s (was 15/10s, caused freeze at round ~16-17)"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "2.42"
