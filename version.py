"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.10"
VERSION_LABEL = "v2.7.10 — fix: чёрный экран в бою — #bb-root теперь имеет CSS inset:0 как fallback. Если canvas getBoundingClientRect возвращает 0×0 (race при переходе сцен), используется full viewport вместо невидимого 0×0. + resize listener для поворота экрана."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.80"
