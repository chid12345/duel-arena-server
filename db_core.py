"""
db_core.py — подключение к БД + SQL-адаптер SQLite↔PostgreSQL.
Содержит: get_connection(), _PatchedCursor, _PatchedConn, вспомогательные функции дат/наград.
"""

from __future__ import annotations

import logging
import re
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Tuple

from config import DATABASE_URL, DB_NAME

_log = logging.getLogger(__name__)


# ─── Утилиты дат и наград ─────────────────────────────────────────────────────

def iso_week_key_utc(ts: Optional[float] = None) -> str:
    """Ключ ISO-недели по UTC, как в API (2026-W15)."""
    t = time.time() if ts is None else float(ts)
    dt = datetime.fromtimestamp(t, tz=timezone.utc)
    y, w, _ = dt.isocalendar()
    return f"{int(y)}-W{int(w):02d}"


def prev_iso_week_bounds_utc() -> Tuple[str, datetime, datetime]:
    """Прошлая ISO-неделя: (week_key, start включительно, end исключительно), UTC naive для SQL."""
    now = datetime.now(timezone.utc)
    d = now.date()
    monday = datetime(d.year, d.month, d.day, tzinfo=timezone.utc) - timedelta(days=d.weekday())
    week_start_cur = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_prev = week_start_cur - timedelta(days=7)
    week_end_prev = week_start_cur
    y, w, _ = week_start_prev.date().isocalendar()
    key = f"{int(y)}-W{int(w):02d}"
    start_naive = week_start_prev.replace(tzinfo=None)
    end_naive = week_end_prev.replace(tzinfo=None)
    return key, start_naive, end_naive


def weekly_pvp_rank_reward(rank: int) -> Tuple[int, str]:
    if rank == 1:
        return 120, "Легенда PvP"
    if rank == 2:
        return 80, "Мастер PvP"
    if rank == 3:
        return 50, "Герой арены"
    if 4 <= rank <= 10:
        return 20, "Участник топа"
    return 0, ""


def weekly_titan_rank_reward(rank: int) -> Tuple[int, str]:
    if rank == 1:
        return 150, "Покоритель Титанов"
    if rank == 2:
        return 90, "Гроза Башни"
    if rank == 3:
        return 60, "Титаноборец"
    if 4 <= rank <= 10:
        return 25, "Штурмовик Башни"
    return 0, ""


# ─── SQL-адаптер SQLite → PostgreSQL ──────────────────────────────────────────

def _norm_sql(sql: str) -> str:
    return " ".join(sql.split())


_PG_EXACT: List[Tuple[str, str]] = [
    (
        "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?, ?, 0, 0, 0)",
        "INSERT INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (%s, %s, 0, 0, FALSE) ON CONFLICT (user_id, quest_date) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO improvements (user_id, improvement_type, level) VALUES (?, ?, 0)",
        "INSERT INTO improvements (user_id, improvement_type, level) VALUES (%s, %s, 0) ON CONFLICT (user_id, improvement_type) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO bots (name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "INSERT INTO bots (name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (name) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO referrals (referral_code, referrer_id, referred_id) VALUES (?, ?, ?)",
        "INSERT INTO referrals (referral_code, referrer_id, referred_id) VALUES (%s, %s, %s) ON CONFLICT (referred_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO season_stats (season_id, user_id) VALUES (?, ?)",
        "INSERT INTO season_stats (season_id, user_id) VALUES (%s, %s) ON CONFLICT (season_id, user_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)",
        "INSERT INTO battle_pass (user_id, season_id) VALUES (%s, %s) ON CONFLICT (user_id, season_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        "INSERT INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status) VALUES (%s, %s, %s, %s, %s, 'pending') ON CONFLICT (invoice_id) DO NOTHING",
    ),
    (
        "INSERT OR REPLACE INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (?, ?, ?, ?)",
        "INSERT INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (%s, %s, %s, %s) "
        "ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, chat_id = EXCLUDED.chat_id, message_id = EXCLUDED.message_id",
    ),
    (
        "INSERT OR IGNORE INTO endless_attempts (user_id, attempt_date, attempts_used, extra_gold, extra_diamond) VALUES (?,?,0,0,0)",
        "INSERT INTO endless_attempts (user_id, attempt_date, attempts_used, extra_gold, extra_diamond) VALUES (%s, %s, 0, 0, 0) ON CONFLICT (user_id, attempt_date) DO NOTHING",
    ),
]


def _adapt_sql_pg(sql: str) -> str:
    n = _norm_sql(sql)
    for lite, pg in _PG_EXACT:
        if n == _norm_sql(lite):
            return pg
    s = sql
    s = re.sub(
        r"datetime\s*\(\s*'now'\s*,\s*\?\s*\|\|\s*' seconds'\s*\)",
        "__PG_INTERVAL_SEC__",
        s,
    )
    s = s.replace("datetime('now', '-1 day')", "(NOW() - INTERVAL '1 day')")
    s = s.replace("datetime('now', '-1 hour')", "(NOW() - INTERVAL '1 hour')")
    s = s.replace("datetime('now', '-5 minutes')", "(NOW() - INTERVAL '5 minutes')")
    s = s.replace("datetime('now', '-20 hours')", "(NOW() - INTERVAL '20 hours')")
    s = s.replace("strftime('%H:%M', created_at)", "to_char(created_at, 'HH24:MI')")
    s = s.replace("rating = MAX(900, rating - 5)", "rating = GREATEST(900, rating - 5)")
    s = s.replace(
        "referral_usdt_balance = MAX(0, COALESCE(referral_usdt_balance,0) - ?)",
        "referral_usdt_balance = GREATEST(0, COALESCE(referral_usdt_balance,0) - ?)",
    )
    s = re.sub(r'\bMAX\s*\(\s*(\w[\w.]*)\s*,\s*(\w[\w.]*)\s*\)', r'GREATEST(\1, \2)', s)
    s = re.sub(r'\breward_claimed\s*=\s*1\b', 'reward_claimed = TRUE',  s)
    s = re.sub(r'\breward_claimed\s*=\s*0\b', 'reward_claimed = FALSE', s)
    s = re.sub(r'\bis_bot2\s*=\s*1\b',        'is_bot2 = TRUE',         s)
    s = re.sub(r'\bis_bot2\s*=\s*0\b',        'is_bot2 = FALSE',        s)
    s = re.sub(r'\bis_bot1\s*=\s*1\b',        'is_bot1 = TRUE',         s)
    s = re.sub(r'\bis_bot1\s*=\s*0\b',        'is_bot1 = FALSE',        s)
    s = re.sub(r'\bis_premium\s*=\s*1\b',     'is_premium = TRUE',      s)
    s = re.sub(r'\bis_premium\s*=\s*0\b',     'is_premium = FALSE',     s)
    s = re.sub(r'\bclaimed\s*=\s*1\b',        'claimed = TRUE',         s)
    s = re.sub(r'\bclaimed\s*=\s*0\b',        'claimed = FALSE',        s)
    s = re.sub(r'\bis_active\s*=\s*1\b',      'is_active = TRUE',       s)
    s = re.sub(r'\bis_active\s*=\s*0\b',      'is_active = FALSE',      s)
    # DDL: INTEGER DEFAULT 0/1 → BOOLEAN для булевых колонок в CREATE TABLE
    s = re.sub(r'\bis_active\s+INTEGER\s+DEFAULT\s+0\b', 'is_active BOOLEAN DEFAULT FALSE', s)
    s = re.sub(r'\bis_active\s+INTEGER\s+DEFAULT\s+1\b', 'is_active BOOLEAN DEFAULT TRUE',  s)
    s = s.replace("?", "%s")
    s = s.replace("__PG_INTERVAL_SEC__", "(NOW() + (%s::text || ' seconds')::interval)")
    return s


# ─── Патч-обёртки курсора и соединения ────────────────────────────────────────

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


# ─── Базовый класс подключения ─────────────────────────────────────────────────

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
