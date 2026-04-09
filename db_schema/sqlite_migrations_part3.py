"""SQLite migrations chunk 3."""
from __future__ import annotations

MIGRATIONS_PART3 = [
    ("2026_04_16_002_titan_and_weekly_claims", [
        """CREATE TABLE IF NOT EXISTS titan_progress (
            user_id INTEGER PRIMARY KEY,
            best_floor INTEGER DEFAULT 0,
            current_floor INTEGER DEFAULT 1,
            weekly_best_floor INTEGER DEFAULT 0,
            weekly_best_at INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_titan_weekly_best ON titan_progress (weekly_best_floor DESC, weekly_best_at ASC)",
        """CREATE TABLE IF NOT EXISTS weekly_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            week_key TEXT NOT NULL,
            claim_key TEXT NOT NULL,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, week_key, claim_key)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_weekly_claims_user_week ON weekly_claims (user_id, week_key)",
    ]),
    ("2026_04_16_003_profile_reset_ts", [
        "ALTER TABLE players ADD COLUMN profile_reset_ts INTEGER DEFAULT 0",
    ]),
    ("2026_04_17_001_weekly_leaderboard_rewards", [
        "ALTER TABLE players ADD COLUMN display_title TEXT",
        """CREATE TABLE IF NOT EXISTS weekly_leaderboard_payouts (
            week_key TEXT NOT NULL,
            board TEXT NOT NULL,
            paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (week_key, board)
        )""",
        """CREATE TABLE IF NOT EXISTS titan_weekly_scores (
            user_id INTEGER NOT NULL,
            week_key TEXT NOT NULL,
            max_floor INTEGER NOT NULL DEFAULT 0,
            best_at INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, week_key)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_tws_week_rank ON titan_weekly_scores (week_key, max_floor DESC, best_at ASC)",
    ]),
    ("2026_04_18_001_endless_mode", [
        """CREATE TABLE IF NOT EXISTS endless_progress (
            user_id INTEGER PRIMARY KEY,
            best_wave INTEGER DEFAULT 0,
            current_wave INTEGER DEFAULT 0,
            current_hp INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS endless_attempts (
            user_id INTEGER NOT NULL,
            attempt_date TEXT NOT NULL,
            attempts_used INTEGER DEFAULT 0,
            extra_gold INTEGER DEFAULT 0,
            extra_diamond INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, attempt_date)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_endless_progress_best ON endless_progress (best_wave DESC, updated_at ASC)",
    ]),
    ("2026_04_19_002_battlepass_endless", [
        "ALTER TABLE battle_pass ADD COLUMN endless_done INTEGER DEFAULT 0",
        "ALTER TABLE battle_pass ADD COLUMN endless_tier_claimed INTEGER DEFAULT 0",
    ]),
    ("2026_04_19_001_endless_quests", [
        "ALTER TABLE daily_quests ADD COLUMN endless_wins INTEGER DEFAULT 0",
        """CREATE TABLE IF NOT EXISTS endless_weekly_scores (
            user_id INTEGER NOT NULL,
            week_key TEXT NOT NULL,
            weekly_wins INTEGER NOT NULL DEFAULT 0,
            best_wave_this_week INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, week_key)
        )""",
    ]),
    ("2026_04_20_001_avatar_classes", [
        "ALTER TABLE players ADD COLUMN equipped_avatar_id TEXT",
        """CREATE TABLE IF NOT EXISTS user_avatar_unlocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            avatar_id TEXT NOT NULL,
            source TEXT DEFAULT 'shop',
            unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, avatar_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_avatar_unlocks_user ON user_avatar_unlocks (user_id)",
    ]),
    ("2026_04_20_002_elite_builds_is_active_bool", [
        # PostgreSQL: конвертируем is_active INTEGER → BOOLEAN чтобы
        # совпадало с db_core.py _sqlite_to_pg() который пишет is_active = TRUE/FALSE
        """DO $$ BEGIN
             IF EXISTS (
                 SELECT 1 FROM information_schema.columns
                 WHERE table_name='user_elite_builds'
                   AND column_name='is_active'
                   AND data_type='integer'
             ) THEN
                 ALTER TABLE user_elite_builds
                     ALTER COLUMN is_active TYPE BOOLEAN
                     USING is_active::boolean;
             END IF;
           END $$""",
    ]),
    ("2026_04_21_001_class_inventory_fields", [
        "ALTER TABLE players ADD COLUMN current_class TEXT",
        "ALTER TABLE players ADD COLUMN current_class_type TEXT",
    ]),
]
