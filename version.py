"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.17"
VERSION_LABEL = "v2.7.17 — КОРНЕВОЙ ФИКС: rootComputedPos='static' — CSS не применялся! position:fixed теперь inline + все inset:0 заменены на полную форму top/left/right/bottom (Telegram WebView не парсит inset shorthand → ломал весь CSS-блок)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.87"
