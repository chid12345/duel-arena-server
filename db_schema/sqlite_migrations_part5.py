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
        "UPDATE players SET warrior_type = 'default' WHERE warrior_type = 'neutral'",
    ]),
    # Составной индекс для еженедельного PvP-лидерборда: фильтр по is_bot2=0
    # + диапазон created_at. Без него на 100k+ боёв скан всего набора.
    ("2026_04_23_001_battles_pvp_weekly_idx", [
        "CREATE INDEX IF NOT EXISTS idx_battles_pvp_weekly ON battles (is_bot2, created_at)",
    ]),
    # Боты с win-streak'ом — для надписи «🔥 N побед подряд» в карточке соперника.
    # Колонка инкрементится после каждой победы бота, сбрасывается при поражении.
    ("2026_04_29_001_bots_win_streak", [
        "ALTER TABLE bots ADD COLUMN win_streak INTEGER DEFAULT 0",
    ]),
]
