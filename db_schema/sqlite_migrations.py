"""Объединённый список миграций SQLite."""
from __future__ import annotations

from .sqlite_migrations_part1 import MIGRATIONS_PART1
from .sqlite_migrations_part2 import MIGRATIONS_PART2
from .sqlite_migrations_part3 import MIGRATIONS_PART3
from .sqlite_migrations_part4 import MIGRATIONS_PART4
from .sqlite_migrations_part5 import MIGRATIONS_PART5

SQLITE_MIGRATIONS = MIGRATIONS_PART1 + MIGRATIONS_PART2 + MIGRATIONS_PART3 + MIGRATIONS_PART4 + MIGRATIONS_PART5
