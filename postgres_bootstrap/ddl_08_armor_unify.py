"""DDL для старого armor (player_owned_armor, armor_custom_mods).

Старый armor снесён под корень. CREATE TABLE здесь убраны, чтобы PG bootstrap
не создавал пустые мусорные таблицы. На существующих БД таблицы дропнет
sqlite_migrations_part12_armor_wipe (DROP TABLE IF EXISTS).
"""
from __future__ import annotations

POSTGRES_DDL_08_ARMOR_UNIFY: tuple[str, ...] = ()
