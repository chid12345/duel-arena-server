"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.14"
VERSION_LABEL = "v2.7.14 — REVERT: bot_battle_html.js + bot_battle_css.js откачены к v2.7.09 (до моих CSS-экспериментов с inset:0). Сохранено всё полезное: WS-фикс, watchdog, ← Меню, SafeMode, _S() helper, try-catch _renderShell."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.84"
