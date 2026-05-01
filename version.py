"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.03"
VERSION_LABEL = "v2.7.03 — feat: SafeMode (SafeMode.toggle() в консоли — убирает backdrop-filter/blur/shadow для диагностики лагов). fix: tweens.killAll() в BattleScene.shutdown()."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.73"
