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
        # pg_try_advisory_lock — неблокирующий (не бьёт statement_timeout Supabase).
        # Только тот процесс, кто взял лок, запускает DDL.
        # Остальные ждут (Python sleep) и пропускают bootstrap — схема уже готова.
        for attempt in range(12):
            cursor.execute(
                "SELECT pg_try_advisory_lock(%s, %s)",
                (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
            )
            row = cursor.fetchone()
            if row and next(iter(row.values())):
                schema_lock_held = True
                break
            _log.info("pg_init: schema lock busy, retry %d/12 (5s)...", attempt + 1)
            time.sleep(5)

        if schema_lock_held:
            bootstrap_postgres_schema(cursor)
            conn.commit()
            cursor.execute(
                "SELECT pg_advisory_unlock(%s, %s)",
                (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
            )
            conn.commit()
            schema_lock_held = False
        else:
            # Другой инстанс держит лок и выполняет DDL — схема уже будет готова
            _log.info("pg_init: lock not acquired — schema initialised by another instance")

        # Init lock для ботов — только один инстанс заполняет начальные данные
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
