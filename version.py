"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.17.4"
VERSION_LABEL = "v2.17.4 — fix: WS-тик не падает если _build_participants_block или _build_top_block упали"

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "14.14"
