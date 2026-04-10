"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.1.15"
VERSION_LABEL = "v1.1.15 — fix: duplicate _safe_crit_stat/_safe_int_field in MRO shadowed damage.py version"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "2.39"
