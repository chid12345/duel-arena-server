"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.8.23"
VERSION_LABEL = "v1.8.23 — fix: wb_rewards.claimed INTEGER→BOOLEAN через after_ddl DO блок"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "6.57"
