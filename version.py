"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.02"
VERSION_LABEL = "v2.7.02 — fix: чёрный экран в бою — shutdown ext3b теперь вызывает BotBattleHtml.unmount() (mounted не застревал в true), bot_battle_html.js заменяет window.State на прямой доступ к State (const не виден через window)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.72"
