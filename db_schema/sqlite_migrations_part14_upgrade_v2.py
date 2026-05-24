"""SQLite migrations chunk 14 — апгрейды v2 (без шардов).

Сносим шард-таблицу upgrade_materials и пересобираем item_upgrades под новую
схему: diamonds_invested (часть уровней платится алмазами) + free_used (лимит
бесплатных «удачных» апгрейдов на вещь). Живых игроков нет — прокачку обнуляем.
"""
from __future__ import annotations

MIGRATIONS_PART14_UPGRADE_V2 = [
    ("2026_05_24_001_upgrade_v2_reset", [
        "DROP TABLE IF EXISTS upgrade_materials",
        "DROP TABLE IF EXISTS item_upgrades",
        """CREATE TABLE item_upgrades (
            user_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            plus_level INTEGER NOT NULL DEFAULT 0,
            gold_invested INTEGER NOT NULL DEFAULT 0,
            diamonds_invested INTEGER NOT NULL DEFAULT 0,
            free_used INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, item_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_item_upgrades_user ON item_upgrades (user_id)",
    ]),
]
