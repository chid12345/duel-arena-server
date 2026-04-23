"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "1.9.99"
VERSION_LABEL = "v1.9.99 — perf: WB N+1 батч, battle sync→to_thread, track_purchase 1 conn, battle shutdown"

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "8.33"
