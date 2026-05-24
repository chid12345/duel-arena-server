"""DDL для апгрейдов предметов (система v2, без шардов)."""
from __future__ import annotations

POSTGRES_DDL_07_UPGRADES: tuple[str, ...] = (
    """CREATE TABLE IF NOT EXISTS item_upgrades (
        user_id BIGINT NOT NULL,
        item_id TEXT NOT NULL,
        plus_level INTEGER NOT NULL DEFAULT 0,
        gold_invested INTEGER NOT NULL DEFAULT 0,
        diamonds_invested INTEGER NOT NULL DEFAULT 0,
        free_used INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_item_upgrades_user ON item_upgrades (user_id)",
    # Миграция уже существующей PG-таблицы на схему v2 (идемпотентно):
    # CREATE IF NOT EXISTS не добавляет столбцы в готовую таблицу, поэтому отдельно.
    "ALTER TABLE item_upgrades ADD COLUMN IF NOT EXISTS diamonds_invested INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE item_upgrades ADD COLUMN IF NOT EXISTS free_used INTEGER NOT NULL DEFAULT 0",
    # Шарды убраны — таблица материалов больше не нужна.
    "DROP TABLE IF EXISTS upgrade_materials",
)
