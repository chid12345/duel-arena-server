"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.13"
VERSION_LABEL = "v2.7.13 — fix: чёрный экран — заменён CSS inset:0 на полный top:0;left:0;right:0;bottom:0 + 100vw/100vh + !important. Старый Telegram WebView не парсит inset shorthand."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.83"
