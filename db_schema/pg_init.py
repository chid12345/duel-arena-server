"""Инициализация PostgreSQL: advisory lock + bootstrap_postgres_schema."""
from __future__ import annotations

import logging
import time
from typing import Any

_log = logging.getLogger(__name__)


def init_database_postgres(db: Any) -> None:
    from postgres_bootstrap import bootstrap_postgres_schema

    conn = db.get_connection()
    cursor = conn.cursor()
    schema_lock_held = False
    init_lock_held = False
    try:
        # try_advisory_lock + retry — не зависаем если предыдущий инстанс не отпустил
        for attempt in range(8):
            cursor.execute(
                "SELECT pg_try_advisory_lock(%s, %s)",
                (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
            )
            row = cursor.fetchone()
            if row and next(iter(row.values())):
                schema_lock_held = True
                break
            _log.info("pg_init: schema lock busy, retry %d/8...", attempt + 1)
            time.sleep(3)

        if not schema_lock_held:
            _log.warning("pg_init: schema lock not acquired after retries, proceeding anyway")

        # bootstrap всегда — CREATE IF NOT EXISTS безопасен без lock
        bootstrap_postgres_schema(cursor)
        conn.commit()

        # Unlock schema lock
        if schema_lock_held:
            cursor.execute(
                "SELECT pg_advisory_unlock(%s, %s)",
                (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
            )
            conn.commit()
            schema_lock_held = False

        # Init lock для ботов — только один инстанс
        cursor.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (db._ADV_PG_INIT_K1, db._ADV_PG_INIT_K2),
        )
        row = cursor.fetchone()
        init_lock_held = bool(row and next(iter(row.values())))
        if init_lock_held:
            db.create_initial_bots(conn)
            db.rebalance_all_bots(conn)
    finally:
        if schema_lock_held:
            try:
                cursor.execute(
                    "SELECT pg_advisory_unlock(%s, %s)",
                    (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
                )
                conn.commit()
            except Exception:
                pass
        if init_lock_held:
            try:
                cursor.execute(
                    "SELECT pg_advisory_unlock(%s, %s)",
                    (db._ADV_PG_INIT_K1, db._ADV_PG_INIT_K2),
                )
                conn.commit()
            except Exception:
                pass
        conn.close()
