"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.1.13"
VERSION_LABEL = "v1.1.13 — fix: _execute_round crashes on every round (defender_debuffs TypeError + missing _hp_delta_text)"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "2.37"
