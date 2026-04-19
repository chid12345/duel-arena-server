"""Инициализация PostgreSQL: advisory lock + bootstrap_postgres_schema."""
from __future__ import annotations

import logging
from typing import Any

_log = logging.getLogger(__name__)


def init_database_postgres(db: Any) -> None:
    from postgres_bootstrap import bootstrap_postgres_schema

    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        # Блокирующий lock — второй инстанс ждёт, а не запускает DDL параллельно.
        # Session-level: автоматически снимается при закрытии соединения (сбой = safe).
        cursor.execute(
            "SELECT pg_advisory_lock(%s, %s)",
            (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
        )

        bootstrap_postgres_schema(cursor)
        conn.commit()

        cursor.execute(
            "SELECT pg_advisory_unlock(%s, %s)",
            (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
        )
        conn.commit()

        # Init lock — только один инстанс заполняет ботов
        cursor.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (db._ADV_PG_INIT_K1, db._ADV_PG_INIT_K2),
        )
        row = cursor.fetchone()
        init_lock_held = bool(row and next(iter(row.values())))
        if init_lock_held:
            db.create_initial_bots(conn)
            db.rebalance_all_bots(conn)
            cursor.execute(
                "SELECT pg_advisory_unlock(%s, %s)",
                (db._ADV_PG_INIT_K1, db._ADV_PG_INIT_K2),
            )
            conn.commit()
    except Exception as e:
        _log.error("pg_init error: %s", e)
        raise
    finally:
        conn.close()
