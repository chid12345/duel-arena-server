"""Инициализация PostgreSQL: advisory lock + bootstrap_postgres_schema."""
from __future__ import annotations

from typing import Any


def init_database_postgres(db: Any) -> None:
    from postgres_bootstrap import bootstrap_postgres_schema

    conn = db.get_connection()
    cursor = conn.cursor()
    schema_lock_held = False
    lock_held = False
    try:
        cursor.execute(
            "SELECT pg_advisory_lock(%s, %s)",
            (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
        )
        schema_lock_held = True
        try:
            bootstrap_postgres_schema(cursor)
            conn.commit()
        finally:
            ucur = conn.cursor()
            ucur.execute(
                "SELECT pg_advisory_unlock(%s, %s)",
                (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
            )
            conn.commit()
            schema_lock_held = False

        cursor.execute(
            "SELECT pg_try_advisory_lock(%s, %s)",
            (db._ADV_PG_INIT_K1, db._ADV_PG_INIT_K2),
        )
        row = cursor.fetchone()
        lock_held = bool(row and next(iter(row.values())))
        if lock_held:
            db.create_initial_bots(conn)
            db.rebalance_all_bots(conn)
    finally:
        if schema_lock_held:
            try:
                ucur = conn.cursor()
                ucur.execute(
                    "SELECT pg_advisory_unlock(%s, %s)",
                    (db._ADV_PG_SCHEMA_K1, db._ADV_PG_SCHEMA_K2),
                )
                conn.commit()
            except Exception:
                pass
        if lock_held:
            try:
                ucur = conn.cursor()
                ucur.execute(
                    "SELECT pg_advisory_unlock(%s, %s)",
                    (db._ADV_PG_INIT_K1, db._ADV_PG_INIT_K2),
                )
                conn.commit()
            except Exception:
                pass
        conn.close()
