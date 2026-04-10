"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.1.28"
VERSION_LABEL = "v1.1.28 — fix: hp_small potion wrongly blocked when current_hp=0 (falsy `or` bug)"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "2.52"
