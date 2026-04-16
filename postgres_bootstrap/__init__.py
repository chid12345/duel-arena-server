"""
Инициализация схемы PostgreSQL (Supabase / Render).
SQLite-миграции не выполняются: схема создаётся целиком, затем помечаются все migration_id.
"""

from __future__ import annotations

from postgres_bootstrap.after_ddl import POSTGRES_AFTER_DDL
from postgres_bootstrap.ddl_01_players_and_core import POSTGRES_DDL_01
from postgres_bootstrap.ddl_02_features import POSTGRES_DDL_02
from postgres_bootstrap.ddl_03_indexes import POSTGRES_DDL_03
from postgres_bootstrap.ddl_04_clan_v2 import POSTGRES_DDL_04_CLAN_V2
from postgres_bootstrap.migration_ids import POSTGRES_MIGRATION_IDS

POSTGRES_DDL_STATEMENTS: tuple[str, ...] = (
    POSTGRES_DDL_01 + POSTGRES_DDL_02 + POSTGRES_DDL_03 + POSTGRES_DDL_04_CLAN_V2
)

__all__ = (
    "POSTGRES_AFTER_DDL",
    "POSTGRES_DDL_STATEMENTS",
    "POSTGRES_MIGRATION_IDS",
    "bootstrap_postgres_schema",
)


def bootstrap_postgres_schema(cursor) -> None:
    """Выполнить DDL и отметить все миграции применёнными (новая пустая БД)."""
    for stmt in POSTGRES_DDL_STATEMENTS:
        cursor.execute(stmt.strip())
    for stmt in POSTGRES_AFTER_DDL:
        cursor.execute(stmt)
    for mid in POSTGRES_MIGRATION_IDS:
        cursor.execute(
            "INSERT INTO schema_migrations (migration_id) VALUES (%s) ON CONFLICT (migration_id) DO NOTHING",
            (mid,),
        )
