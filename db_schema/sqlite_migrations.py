"""Объединённый список миграций SQLite."""
from __future__ import annotations

from .sqlite_migrations_part1 import MIGRATIONS_PART1
from .sqlite_migrations_part2 import MIGRATIONS_PART2
from .sqlite_migrations_part3 import MIGRATIONS_PART3
from .sqlite_migrations_part4 import MIGRATIONS_PART4
from .sqlite_migrations_part5 import MIGRATIONS_PART5
from .sqlite_migrations_part6_upgrades import MIGRATIONS_PART6_UPGRADES
from .sqlite_migrations_part7_premium import MIGRATIONS_PART7_PREMIUM
from .sqlite_migrations_part8_rentals import MIGRATIONS_PART8_RENTALS
from .sqlite_migrations_part9_bots_warrior import MIGRATIONS_PART9_BOTS_WARRIOR
from .sqlite_migrations_part10_armor_unify import MIGRATIONS_PART10_ARMOR_UNIFY
from .sqlite_migrations_part_clan_v2 import MIGRATIONS_PART_CLAN_V2
from .sqlite_migrations_part_season_pass import MIGRATIONS_PART_SEASON_PASS
from .sqlite_migrations_part_world_boss import MIGRATIONS_PART_WORLD_BOSS

SQLITE_MIGRATIONS = (
    MIGRATIONS_PART1 + MIGRATIONS_PART2 + MIGRATIONS_PART3
    + MIGRATIONS_PART4 + MIGRATIONS_PART5 + MIGRATIONS_PART_CLAN_V2
    + MIGRATIONS_PART_WORLD_BOSS + MIGRATIONS_PART_SEASON_PASS
    + MIGRATIONS_PART6_UPGRADES + MIGRATIONS_PART7_PREMIUM
    + MIGRATIONS_PART8_RENTALS + MIGRATIONS_PART9_BOTS_WARRIOR
    + MIGRATIONS_PART10_ARMOR_UNIFY
)
