"""Прогон встроенных миграций SQLite (schema_migrations)."""
from __future__ import annotations

import logging
from typing import Any

from .sqlite_migrations import SQLITE_MIGRATIONS

_log = logging.getLogger(__name__)


def apply_sqlite_migrations(cursor: Any) -> None:
    for migration_id, statements in SQLITE_MIGRATIONS:
        cursor.execute(
            "SELECT 1 FROM schema_migrations WHERE migration_id = ?",
            (migration_id,),
        )
        if cursor.fetchone():
            continue
        for statement in statements:
            try:
                cursor.execute(statement)
            except Exception as stmt_err:
                _log.warning(
                    "Migration %s stmt skipped: %s | %s", migration_id, stmt_err, statement[:80]
                )
        cursor.execute(
            "INSERT INTO schema_migrations (migration_id) VALUES (?)",
            (migration_id,),
        )
