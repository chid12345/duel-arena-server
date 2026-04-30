"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.6.96"
VERSION_LABEL = "v2.6.96 — fix: КРИТИЧНО — все кнопки боя не работали с 30.04 (коммит e8a221a случайно удалил <script src=menu_warrior_guard.js> из index.html). Без guard'а _requireWarrior было undefined → _tryBattle, _onFight, _onBotFight, _onTitanFight молча выходили на if(!undefined?.()) return. Подключение восстановлено. Проверено в preview через ?dev=1 — _tryBattle открывает overlay, тап PvP закрывает его и вызывает _onFight."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.66"
