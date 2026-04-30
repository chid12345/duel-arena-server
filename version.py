"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.6.93"
VERSION_LABEL = "v2.6.93 — fix: «В БОЙ» через HTML-оверлей. Phaser-путь _switchTab('battle') повторно ломался (input.enabled=false после оверлеев экипировки, _panels.battle destroyed, scroll камеры). Заменён на HTML-оверлей BattleSelectHTML — той же надёжности что helmet/boots/ring/wardrobe (работает на Android Telegram WebView 100%, не зависит от scene state). Меню режимов: PvP / Башня / Натиск / Бот / Вызов по нику / Мои вызовы."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.63"
