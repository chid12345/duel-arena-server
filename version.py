"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.08"
VERSION_LABEL = "v2.21.08 — Balance Этап 3B: распил db_schema/equipment_catalog.py (361 строка, аварийно) на пакет db_schema/equipment_items/. 6 новых файлов по слотам (helmets/shields/rings/boots/swords_legacy/__init__), каждый ≤200 строк. equipment_catalog.py сокращён до 89 строк (aggregator). Закон 1 соблюдён везде. Чистый перенос — числа НЕ менялись. 140/140 зелёные."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.59"
