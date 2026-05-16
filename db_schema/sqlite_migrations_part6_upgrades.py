"""SQLite migrations chunk 6 — апгрейды предметов (Этап 4B редизайна).

Две таблицы:
- item_upgrades: +N для каждого экземпляра предмета в инвентаре игрока
- upgrade_materials: счётчики шардов по тиру (shard_T1..shard_T4)
"""
from __future__ import annotations

MIGRATIONS_PART6_UPGRADES = [
    ("2026_05_16_001_item_upgrades", [
        """CREATE TABLE IF NOT EXISTS item_upgrades (
            user_id INTEGER NOT NULL,
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
    ]),
    ("2026_05_16_002_upgrade_materials", [
        """CREATE TABLE IF NOT EXISTS upgrade_materials (
            user_id INTEGER NOT NULL,
            mat_type TEXT NOT NULL,
            qty INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, mat_type)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_upgrade_materials_user ON upgrade_materials (user_id)",
    ]),
]
