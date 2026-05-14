"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.19.70"
VERSION_LABEL = "v2.19.70 — fix: на resume отключаем Phaser scale listeners на 500мс, чтобы expand-анимация Telegram не каскадировала refit"

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "15.89"
