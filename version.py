"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.1.19"
VERSION_LABEL = "v1.1.19 — fix: PvP battle_ended WS event now sent to opponent (battle deleted before check); opp defeat_gold shown"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "2.43"
