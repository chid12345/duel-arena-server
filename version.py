"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.1.14"
VERSION_LABEL = "v1.1.14 — fix: afk round TypeError (defense_skips_block), skip block logic for is_afk"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "2.38"
