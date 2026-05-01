"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.07"
VERSION_LABEL = "v2.7.07 — fix: emergency exit ставит skip-флаг (нет цикла Menu↔Battle); _renderShell в try-catch с fallback UI «Ошибка отрисовки» вместо чёрного экрана; диагностические логи в _renderShell для отладки."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.77"
