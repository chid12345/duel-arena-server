"""Подключение SQLite / PostgreSQL и обёртка курсора."""

from __future__ import annotations

import sqlite3
import threading
from typing import Any, Optional

from config import DATABASE_URL, DB_NAME

from db_core.sql_adapt import _adapt_sql_pg


class _CachedSQLiteConn:
    """SQLite-соединение с no-op close() — переиспользуется между запросами."""

    def __init__(self, raw: Any):
        self._raw = raw

    def cursor(self):
        return self._raw.cursor()

    def commit(self):
        return self._raw.commit()

    def rollback(self):
        return self._raw.rollback()

    def execute(self, sql: str, params=None):
        if params is None:
            return self._raw.execute(sql)
        return self._raw.execute(sql, params)

    def close(self):
        pass  # Не закрываем — соединение переиспользуется

    def __getattr__(self, name: str):
        return getattr(self._raw, name)


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


class _PooledConn(_PatchedConn):
    """Обёртка соединения из пула: close() возвращает в пул вместо закрытия."""

    def __init__(self, raw: Any, pool: Any):
        super().__init__(raw, True)
        self._pool = pool

    def close(self):
        try:
            if self._raw.info.transaction_status != 0:  # IDLE=0
                self._raw.rollback()
        except Exception:
            pass
        self._pool.putconn(self._raw)


class DBCore:
    """Управляет подключением к SQLite или PostgreSQL."""

    def __init__(self):
        self._pg = bool(DATABASE_URL)
        self.db_name = DB_NAME
        self._pool: Any = None
        self._pool_lock = threading.Lock()
        self._local = threading.local()  # per-thread SQLite connections

    def _get_pool(self) -> Any:
        if self._pool is not None:
            return self._pool
        with self._pool_lock:
            if self._pool is None:
                from psycopg_pool import ConnectionPool
                from psycopg.rows import dict_row
                self._pool = ConnectionPool(
                    DATABASE_URL,
                    kwargs={"row_factory": dict_row, "prepare_threshold": None},
                    min_size=2,
                    max_size=10,
                    open=True,
                )
        return self._pool

    def _make_sqlite_conn(self) -> Any:
        conn = sqlite3.connect(self.db_name, timeout=30, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA cache_size=-32768")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA temp_store=memory")
        return conn

    def get_connection(self):
        if self._pg:
            pool = self._get_pool()
            raw = pool.getconn()
            return _PooledConn(raw, pool)
        # SQLite: per-thread connection — несколько тредов не блокируют друг друга
        if not getattr(self._local, 'conn', None):
            self._local.conn = self._make_sqlite_conn()
        return _CachedSQLiteConn(self._local.conn)
