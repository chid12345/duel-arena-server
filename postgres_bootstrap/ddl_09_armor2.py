"""DDL для нового чистого armor2 (после сноса старого armor).

Создаёт:
- player_owned_armor2 — что куплено (одна таблица для всех armor2_*).
- armor2_custom_mods — кастомка только для armor2_mythic4 (+19 свободных
  статов, custom_name, passive_type).

Чистая реализация: никаких legacy полей, sync с current_class или mirror-таблиц.
"""
from __future__ import annotations

POSTGRES_DDL_09_ARMOR2: tuple[str, ...] = (
    """CREATE TABLE IF NOT EXISTS player_owned_armor2 (
        user_id BIGINT NOT NULL,
        item_id TEXT NOT NULL,
        owned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_player_owned_armor2_user ON player_owned_armor2 (user_id)",
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
