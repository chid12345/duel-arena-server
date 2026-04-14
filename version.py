"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.6.30"
VERSION_LABEL = "v1.6.30 — fix: rollback после упавшего ALTER TABLE в ensure_avatar_bonus_applied (PostgreSQL)"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "4.64"
