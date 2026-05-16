"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.16"
VERSION_LABEL = "v2.21.16 — Balance Этап 4B: БД и repository для апгрейдов. item_upgrades (plus_level, gold/shards_invested, attempts/fails) + upgrade_materials (shard_T1..T4 по тиру). SQLite миграция + Postgres DDL параллельно. UpgradesMixin (UpgradeRepoMixin + MaterialsRepoMixin) с атомарным consume_shards. Database+conftest обновлены. +13 тестов. Бой/UI не тронуты — будет в 4C/4D/4E."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.67"
