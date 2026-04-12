"""SQLite migrations chunk 4 — система заданий и стрика входа."""
from __future__ import annotations

MIGRATIONS_PART4 = [
    ("2026_04_25_001_task_system", [
        """CREATE TABLE IF NOT EXISTS task_progress (
            user_id INTEGER NOT NULL,
            task_key TEXT NOT NULL,
            value INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, task_key)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_task_progress_user ON task_progress (user_id)",
        """CREATE TABLE IF NOT EXISTS task_claims (
            user_id INTEGER NOT NULL,
            claim_key TEXT NOT NULL,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, claim_key)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_task_claims_user ON task_claims (user_id)",
        """CREATE TABLE IF NOT EXISTS login_streak_v2 (
            user_id INTEGER PRIMARY KEY,
            streak_day INTEGER DEFAULT 0,
            week_set INTEGER DEFAULT 0,
            last_login_date TEXT DEFAULT '',
            days_claimed_json TEXT DEFAULT '[]',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
    ]),
    ("2026_04_25_002_daily_quests_tracking", [
        "ALTER TABLE daily_quests ADD COLUMN bot_wins INTEGER DEFAULT 0",
        "ALTER TABLE daily_quests ADD COLUMN shop_buys INTEGER DEFAULT 0",
    ]),
]
