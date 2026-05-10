"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.18.89"
VERSION_LABEL = "v2.18.89 — fix: diamond_first_100/300/500 добавлены в PostgreSQL схему (after_ddl + migration_ids)"

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "15.09"
