"""Подключение SQLite / PostgreSQL и обёртка курсора."""

from __future__ import annotations

import sqlite3
from typing import Any, Optional

from config import DATABASE_URL, DB_NAME

from db_core.sql_adapt import _adapt_sql_pg


class _PatchedCursor:
    """Для PostgreSQL: плейсхолдеры и отличия диалекта от SQLite."""

    def __init__(self, raw: Any, use_pg: bool):
        self._raw = raw
        self._use_pg = use_pg

    def execute(self, sql: str, params: Optional[Any] = None):
        if self._use_pg:
            sql = _adapt_sql_pg(sql)
        if params is None:
            return self._raw.execute(sql)
        return self._raw.execute(sql, params)

    def __getattr__(self, name: str):
        return getattr(self._raw, name)


class _PatchedConn:
    def __init__(self, raw: Any, use_pg: bool):
        self._raw = raw
        self._use_pg = use_pg

    def cursor(self):
        return _PatchedCursor(self._raw.cursor(), self._use_pg)

    def commit(self):
        return self._raw.commit()

    def rollback(self):
        return self._raw.rollback()

    def close(self):
        return self._raw.close()

    def __getattr__(self, name: str):
        return getattr(self._raw, name)


class DBCore:
    """Управляет подключением к SQLite или PostgreSQL."""

    def __init__(self):
        self._pg = bool(DATABASE_URL)
        self.db_name = DB_NAME

    def get_connection(self):
        if self._pg:
            import psycopg
            from psycopg.rows import dict_row
            raw = psycopg.connect(
                DATABASE_URL, row_factory=dict_row, prepare_threshold=None
            )
            return _PatchedConn(raw, True)
        conn = sqlite3.connect(self.db_name, timeout=15)
        conn.row_factory = sqlite3.Row
        return conn
