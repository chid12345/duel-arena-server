"""Инициализация схемы БД: DDL и миграции (пакет)."""
from __future__ import annotations

from .apply_sqlite_migrations import apply_sqlite_migrations
from .pg_init import init_database_postgres
from .sqlite_init import init_database_sqlite


class DBSchema:
    """Mixin: инициализация и миграция схемы БД."""

    _ADV_PG_SCHEMA_K1 = 428470
    _ADV_PG_SCHEMA_K2 = 921002
    _ADV_PG_INIT_K1 = 428471
    _ADV_PG_INIT_K2 = 921003

    def init_database(self):
        """Инициализация всех таблиц."""
        if self._pg:
            init_database_postgres(self)
            return
        init_database_sqlite(self)

    def _apply_migrations(self, cursor):
        """Применить встроенные миграции для SQLite."""
        apply_sqlite_migrations(cursor)


__all__ = ["DBSchema"]
