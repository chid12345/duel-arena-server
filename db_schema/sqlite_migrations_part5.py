"""SQLite migrations chunk 5 — battle_stats и удаление нейтрального класса."""
from __future__ import annotations

MIGRATIONS_PART5 = [
    ("2026_04_16_000_pvp_wins", [
        "ALTER TABLE daily_quests ADD COLUMN pvp_wins INTEGER DEFAULT 0",
    ]),
    ("2026_04_16_001_battle_stats", [
        """CREATE TABLE IF NOT EXISTS battle_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            battle_type TEXT NOT NULL,
            winner_wtype TEXT NOT NULL DEFAULT 'default',
            loser_wtype TEXT NOT NULL DEFAULT 'default',
            winner_uid INTEGER,
            loser_uid INTEGER,
            turns INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_battle_stats_type_date ON battle_stats (battle_type, created_at)",
    ]),
    ("2026_04_16_002_migrate_neutral_to_default", [
        # neutral теперь полноценный класс (Легионер) — миграция больше не нужна
        "SELECT 1",
    ]),
]
