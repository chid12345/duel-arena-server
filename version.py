"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.7.91"
VERSION_LABEL = "v1.7.91 — perf: _ensure_inventory_schema once-flag + wardrobe asyncio.to_thread"

# Игровая версия для UI (бот / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "6.25"
