"""DDL для апгрейдов предметов (Этап 4B редизайна баланса)."""
from __future__ import annotations

POSTGRES_DDL_07_UPGRADES: tuple[str, ...] = (
    """CREATE TABLE IF NOT EXISTS item_upgrades (
        user_id BIGINT NOT NULL,
        item_id TEXT NOT NULL,
        plus_level INTEGER NOT NULL DEFAULT 0,
        gold_invested INTEGER NOT NULL DEFAULT 0,
        shards_invested INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        fails INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_item_upgrades_user ON item_upgrades (user_id)",
    """CREATE TABLE IF NOT EXISTS upgrade_materials (
        user_id BIGINT NOT NULL,
        mat_type TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, mat_type)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_upgrade_materials_user ON upgrade_materials (user_id)",
)
