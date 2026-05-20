"""DDL для armor2-кастомки (после сноса старого armor).

2026_05_20 — броня (player_owned_armor2) слита в общую player_owned_weapons
(см. миграцию 2026_05_20_001_merge_owned_armor2_into_weapons). Отдельную
таблицу владения больше НЕ создаём. Здесь остаётся только:
- armor2_custom_mods — кастомка для armor2_mythic4 (+19 свободных статов,
  custom_name, passive_type) — спец-поля одного предмета.
"""
from __future__ import annotations

POSTGRES_DDL_09_ARMOR2: tuple[str, ...] = (
    """CREATE TABLE IF NOT EXISTS armor2_custom_mods (
        user_id BIGINT NOT NULL,
        item_id TEXT NOT NULL,
        str_bonus INTEGER NOT NULL DEFAULT 0,
        agi_bonus INTEGER NOT NULL DEFAULT 0,
        int_bonus INTEGER NOT NULL DEFAULT 0,
        end_bonus INTEGER NOT NULL DEFAULT 0,
        custom_name TEXT,
        applied INTEGER NOT NULL DEFAULT 0,
        free_stats_left INTEGER NOT NULL DEFAULT 19,
        passive_type TEXT,
        PRIMARY KEY (user_id, item_id)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_armor2_custom_mods_user ON armor2_custom_mods (user_id)",
)
