"""SQLite migrations — сезоны и батл-пасс (Шаг 5)."""
from __future__ import annotations

MIGRATIONS_PART_SEASON_PASS = [
    # Таблица сезонов: один активный сезон в один момент времени.
    ("2026_05_09_001_bp_seasons", [
        """CREATE TABLE IF NOT EXISTS bp_seasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            theme TEXT NOT NULL DEFAULT 'fire',
            started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ends_at TIMESTAMP NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_bp_seasons_active ON bp_seasons (is_active, ends_at)",
    ]),

    # Прогресс игрока в текущем (или прошлом) сезоне:
    # points — суммарные BP-очки за сезон, level — текущий уровень пасса (0..50).
    # has_premium=1 — игрок купил premium_track этого сезона.
    ("2026_05_09_002_bp_progress", [
        """CREATE TABLE IF NOT EXISTS bp_progress (
            user_id INTEGER NOT NULL,
            season_id INTEGER NOT NULL,
            points INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 0,
            has_premium INTEGER NOT NULL DEFAULT 0,
            premium_purchased_at TIMESTAMP NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, season_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_bp_progress_user ON bp_progress (user_id)",
        "CREATE INDEX IF NOT EXISTS idx_bp_progress_season ON bp_progress (season_id, level)",
    ]),

    # Реестр забранных наград: чтобы игрок не мог забрать одну награду дважды.
    # track: 'free' | 'premium'.
    ("2026_05_09_003_bp_rewards_claimed", [
        """CREATE TABLE IF NOT EXISTS bp_rewards_claimed (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            season_id INTEGER NOT NULL,
            level INTEGER NOT NULL,
            track TEXT NOT NULL,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, season_id, level, track)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_bp_claimed_user ON bp_rewards_claimed (user_id, season_id)",
    ]),
]
