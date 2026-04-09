"""Первичная инициализация SQLite."""
from __future__ import annotations

from typing import Any

from .apply_sqlite_migrations import apply_sqlite_migrations
from .sqlite_ddl import create_sqlite_tables


def init_database_sqlite(db: Any) -> None:
    conn = db.get_connection()
    cursor = conn.cursor()
    create_sqlite_tables(cursor)
    apply_sqlite_migrations(cursor)
    conn.commit()
    conn.close()
    db.create_initial_bots()
    db.rebalance_all_bots()
