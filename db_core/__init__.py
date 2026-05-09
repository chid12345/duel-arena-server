"""
Подключение к БД + SQL-адаптер SQLite↔PostgreSQL.
get_connection(), вспомогательные функции дат/наград.
"""

from __future__ import annotations

from db_core.connection import DBCore
from db_core.week_utils import (
    iso_week_key_utc,
    prev_iso_week_bounds_utc,
    weekly_pvp_rank_reward,
    weekly_titan_rank_reward,
    weekly_natisk_rank_reward,
    weekly_wb_rank_reward,
)

__all__ = (
    "DBCore",
    "iso_week_key_utc",
    "prev_iso_week_bounds_utc",
    "weekly_pvp_rank_reward",
    "weekly_titan_rank_reward",
    "weekly_natisk_rank_reward",
    "weekly_wb_rank_reward",
)
