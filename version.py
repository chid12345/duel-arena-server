"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.20"
VERSION_LABEL = "v2.7.20 — PERF: bots/match.py 3 запроса→1; player_core.py finally conn.close(); endless_routes.py async DB через asyncio.to_thread+gather — устранена блокировка event loop."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.90"
