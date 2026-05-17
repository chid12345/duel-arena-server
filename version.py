"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.62"
VERSION_LABEL = "v2.21.62 — debug_rentals: исправлен ProgrammingError в Postgres (использовать cursor вместо conn.execute, иначе ? не превращается в %s)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.13"
