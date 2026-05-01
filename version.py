"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.05"
VERSION_LABEL = "v2.7.05 — fix: battle crash — mount() в try-catch + isMounted() guard, fallback Phaser если HTML не поднялся. _S() хелпер в bot_battle_html.js."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.75"
