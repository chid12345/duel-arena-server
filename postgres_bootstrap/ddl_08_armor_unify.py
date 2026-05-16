"""DDL для унификации armor (Вариант В, шаг 2/6).

Новые таблицы:
- player_owned_armor — что куплено (аналог player_owned_weapons)
- armor_custom_mods — персональные модификаторы (legendary_usdt: +19 свободных
  статов и custom_name)

Перенос данных из user_inventory в эти таблицы — отдельные DML миграции
в db_schema/sqlite_migrations_part10_armor_unify.py. На свежей PG БД
эти DML не нужны (user_inventory пустой), поэтому здесь только DDL.
"""
from __future__ import annotations

POSTGRES_DDL_08_ARMOR_UNIFY: tuple[str, ...] = (
    """CREATE TABLE IF NOT EXISTS player_owned_armor (
        user_id BIGINT NOT NULL,
        item_id TEXT NOT NULL,
        owned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_player_owned_armor_user ON player_owned_armor (user_id)",
    """CREATE TABLE IF NOT EXISTS armor_custom_mods (
        user_id BIGINT NOT NULL,
        item_id TEXT NOT NULL,
        str_bonus INTEGER NOT NULL DEFAULT 0,
        agi_bonus INTEGER NOT NULL DEFAULT 0,
        int_bonus INTEGER NOT NULL DEFAULT 0,
        end_bonus INTEGER NOT NULL DEFAULT 0,
        custom_name TEXT,
        applied INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, item_id)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_armor_custom_mods_user ON armor_custom_mods (user_id)",
)
