"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.19.73"
VERSION_LABEL = "v2.19.73 — revert: убрал visibilitychange handler в viewport_lock — он ломал Phaser scale state (чёрный экран)"

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "15.92"
