"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.11"
VERSION_LABEL = "v2.7.11 — fix: чёрный экран — добавлены right:auto/bottom:auto к inline-стилям #bb-root (CSS inset:0 + width/height создавали over-constrained box, схлопывающий вложенные элементы в Telegram WebView). + диагностический probe видимости HP-row, fighter, кнопок."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.81"
