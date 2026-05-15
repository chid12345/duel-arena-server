"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.20.22"
VERSION_LABEL = "v2.20.22 — tests: премиум и XP post-cap (9 тестов). activate_premium на N дней, продление складывается, expired = is_active=False, starter_pack одноразовый, diamond_first 100/300/500 независимы. XP после 80lv → gold по rate 0.1, level не пробивает MAX_LEVEL, partial-grant добивает уровень + остаток в gold. Всего 57/57."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.41"
