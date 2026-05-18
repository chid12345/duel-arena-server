"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.66"
VERSION_LABEL = "v2.21.66 — fix deadlock в bootstrap_postgres_schema: skip DDL если все миграции уже в schema_migrations. Раньше при blue-green деплое render новый инстанс запускал DDL параллельно со старым → DeadlockDetected → автодеплой падал status 1. Игрок вручную перезапускал deploy. Теперь skip → новые инстансы стартуют без DDL."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.17"
