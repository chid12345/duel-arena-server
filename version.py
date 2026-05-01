"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.01"
VERSION_LABEL = "v2.7.01 — fix: BattleSelectHTML — overlay теперь выровнен по canvas (_fitToCanvas), не по полному viewport. Добавлен в _closeAllTabOverlays. _onFight/_onBotFight/_onTitanFight: guard no_warrior/no_opponent/null-battle чтобы бои не падали молча."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.71"
