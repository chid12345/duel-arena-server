"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.16"
VERSION_LABEL = "v2.7.16 — diag: что происходит между appendChild и render. Probe показывает rootPos=(0,644) при viewport=480x640 — root уезжает за viewport. Логирую body/html transform, scrollY, offsetParent чтобы найти причину."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.86"
