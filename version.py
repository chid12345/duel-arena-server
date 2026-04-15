"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.6.47"
VERSION_LABEL = "v1.6.47 — fix: warrior_type race in _loadProfileBuffs — preserve local selection against server overwrite"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "4.81"
