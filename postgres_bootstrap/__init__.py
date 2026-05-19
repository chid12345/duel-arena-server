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
from postgres_bootstrap.ddl_05_world_boss import POSTGRES_DDL_05_WORLD_BOSS
from postgres_bootstrap.ddl_06_season_pass import POSTGRES_DDL_06_SEASON_PASS
from postgres_bootstrap.ddl_07_upgrades import POSTGRES_DDL_07_UPGRADES
from postgres_bootstrap.ddl_08_armor_unify import POSTGRES_DDL_08_ARMOR_UNIFY
from postgres_bootstrap.ddl_09_armor2 import POSTGRES_DDL_09_ARMOR2
from postgres_bootstrap.migration_ids import POSTGRES_MIGRATION_IDS

POSTGRES_DDL_STATEMENTS: tuple[str, ...] = (
    POSTGRES_DDL_01 + POSTGRES_DDL_02 + POSTGRES_DDL_03
    + POSTGRES_DDL_04_CLAN_V2 + POSTGRES_DDL_05_WORLD_BOSS
    + POSTGRES_DDL_06_SEASON_PASS + POSTGRES_DDL_07_UPGRADES
    + POSTGRES_DDL_08_ARMOR_UNIFY + POSTGRES_DDL_09_ARMOR2
)

__all__ = (
    "POSTGRES_AFTER_DDL",
    "POSTGRES_DDL_STATEMENTS",
    "POSTGRES_MIGRATION_IDS",
    "bootstrap_postgres_schema",
)


def bootstrap_postgres_schema(cursor) -> None:
    """Выполнить DDL и отметить все миграции применёнными.

    Идемпотентно: если все ожидаемые миграции уже в schema_migrations —
    DDL не запускается. Это критично для blue-green деплоя render —
    при перекатке оба инстанса (старый+новый) пытались делать ALTER TABLE
    одновременно → DeadlockDetected → новый инстанс падал → автодеплой
    помечался failed. Skip DDL устраняет deadlock в стационарном
    состоянии (когда схема уже готова).
    """
    import logging
    _log = logging.getLogger(__name__)

    # 1. Гарантируем что schema_migrations существует (всегда дешёво)
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations ("
        "migration_id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)"
    )

    # 2. Считаем сколько ожидаемых миграций УЖЕ применено
    expected_ids = list(POSTGRES_MIGRATION_IDS)
    cursor.execute(
        "SELECT COUNT(*) AS c FROM schema_migrations WHERE migration_id = ANY(%s)",
        (expected_ids,),
    )
    row = cursor.fetchone()
    applied_count = int(row["c"] if hasattr(row, "get") or isinstance(row, dict) else row[0])

    if applied_count == len(expected_ids):
        _log.info("bootstrap_postgres_schema: skip DDL — %d/%d миграций уже применены",
                  applied_count, len(expected_ids))
        return

    _log.info("bootstrap_postgres_schema: применено %d/%d — запускаем DDL",
              applied_count, len(expected_ids))

    for stmt in POSTGRES_DDL_STATEMENTS:
        cursor.execute(stmt.strip())
    for stmt in POSTGRES_AFTER_DDL:
        cursor.execute(stmt)
    for mid in expected_ids:
        cursor.execute(
            "INSERT INTO schema_migrations (migration_id) VALUES (%s) ON CONFLICT (migration_id) DO NOTHING",
            (mid,),
        )
