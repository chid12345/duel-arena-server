"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.12"
VERSION_LABEL = "v2.7.12 — fix: ЧЁРНЫЙ ЭКРАН (корневая) — visibility probe показал rootPos:'(0,644)' — overlay уезжал за нижнюю границу iframe в Telegram Web. Убраны inline-стили позиции/размера #bb-root, оставлен CSS inset:0 = full iframe viewport."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.82"
