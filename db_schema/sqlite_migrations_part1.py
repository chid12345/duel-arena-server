"""SQLite migrations chunk 1 (см. sqlite_migrations.py)."""
from __future__ import annotations

from config import PLAYER_START_FREE_STATS, PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE, \
    PLAYER_START_CRIT, stats_when_reaching_level


MIGRATIONS_PART1 = [
    ("2026_04_02_001_add_hot_indexes", [
        "CREATE INDEX IF NOT EXISTS idx_players_rating ON players (rating DESC)",
        "CREATE INDEX IF NOT EXISTS idx_players_last_active ON players (last_active)",
        "CREATE INDEX IF NOT EXISTS idx_bots_level ON bots (level)",
        "CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles (created_at)",
        "CREATE INDEX IF NOT EXISTS idx_battles_player1_id ON battles (player1_id)",
        "CREATE INDEX IF NOT EXISTS idx_battles_player2_id ON battles (player2_id)",
        "CREATE INDEX IF NOT EXISTS idx_metric_events_type_time ON metric_events (event_type, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_metric_events_user_time ON metric_events (user_id, created_at)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_improvements_user_type ON improvements (user_id, improvement_type)",
    ]),
    ("2026_04_03_001_player_win_streak", [
        "ALTER TABLE players ADD COLUMN win_streak INTEGER DEFAULT 0",
    ]),
    ("2026_04_03_002_progression_crit_milestones", [
        "ALTER TABLE players ADD COLUMN crit INTEGER DEFAULT 3",
        "ALTER TABLE players ADD COLUMN exp_milestones INTEGER DEFAULT 0",
    ]),
    ("2026_04_03_003_level_zero_based", [
        "UPDATE players SET level = CASE WHEN level > 0 THEN level - 1 ELSE 0 END",
        "UPDATE players SET exp_milestones = 0 WHERE exp_milestones IS NULL",
    ]),
    ("2026_04_03_004_battle_energy", ["SELECT 1"]),
    ("2026_04_04_001_bots_crit", [
        "ALTER TABLE bots ADD COLUMN crit INTEGER DEFAULT 3",
    ]),
    ("2026_04_05_001_generous_energy", ["SELECT 1"]),
    ("2026_04_06_001_global_progress_reset", [
        "UPDATE players SET level = 0, exp = 0, exp_milestones = 0, "
        "strength = 3, endurance = 3, crit = 3, max_hp = 36, current_hp = 36, "
        "free_stats = 5, wins = 0, losses = 0, win_streak = 0, rating = 1000, "
        "gold = 0, daily_streak = 0, last_daily = NULL",
        "UPDATE improvements SET level = 0",
        "DELETE FROM daily_quests",
    ]),
    ("2026_04_07_001_seed_bots_level_zero", [
        """UPDATE bots SET level = 0 WHERE rowid IN (
            SELECT rowid FROM bots WHERE level BETWEEN 1 AND 5 ORDER BY RANDOM() LIMIT 180
        )""",
    ]),
    ("2026_04_08_001_null_crit_defaults", [
        "UPDATE bots SET crit = 3 WHERE crit IS NULL",
        "UPDATE players SET crit = 3 WHERE crit IS NULL",
    ]),
    ("2026_04_09_001_drop_energy_columns", [
        "ALTER TABLE players DROP COLUMN battle_energy",
        "ALTER TABLE players DROP COLUMN energy_cap",
        "ALTER TABLE players DROP COLUMN energy_last_at",
    ]),
    ("2026_04_09_002_referral_system", [
        "ALTER TABLE players ADD COLUMN referral_code TEXT",
        "ALTER TABLE players ADD COLUMN referred_by TEXT",
        """CREATE TABLE IF NOT EXISTS referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referral_code TEXT NOT NULL,
            referrer_id INTEGER NOT NULL,
            referred_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(referred_id)
        )""",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_referral_code ON players (referral_code) WHERE referral_code IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id)",
    ]),
    ("2026_04_09_003_chat_id_and_pvp", [
        "ALTER TABLE players ADD COLUMN chat_id INTEGER",
        """CREATE TABLE IF NOT EXISTS pvp_queue (
            user_id INTEGER PRIMARY KEY,
            level INTEGER NOT NULL,
            chat_id INTEGER NOT NULL,
            message_id INTEGER,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_pvp_queue_level ON pvp_queue (level)",
    ]),
    ("2026_04_09_004_seasons", [
        """CREATE TABLE IF NOT EXISTS seasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS season_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            season_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            rating INTEGER DEFAULT 1000,
            UNIQUE(season_id, user_id),
            FOREIGN KEY (season_id) REFERENCES seasons(id)
        )""",
        """CREATE TABLE IF NOT EXISTS season_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            season_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            rank INTEGER,
            diamonds INTEGER DEFAULT 0,
            reward_title TEXT,
            claimed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "INSERT OR IGNORE INTO seasons (id, name, status) VALUES (1, 'Сезон 1: Начало', 'active')",
    ]),
    ("2026_04_09_005_shop_buffs", [
        "ALTER TABLE players ADD COLUMN xp_boost_charges INTEGER DEFAULT 0",
    ]),
    ("2026_04_09_006_battle_pass", [
        """CREATE TABLE IF NOT EXISTS battle_pass (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            season_id INTEGER NOT NULL DEFAULT 1,
            battles_done INTEGER DEFAULT 0,
            wins_done INTEGER DEFAULT 0,
            streak_done INTEGER DEFAULT 0,
            last_claimed_tier INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, season_id)
        )""",
    ]),
    ("2026_04_09_007_clans", [
        """CREATE TABLE IF NOT EXISTS clans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            tag TEXT UNIQUE NOT NULL,
            leader_id INTEGER NOT NULL,
            description TEXT DEFAULT '',
            level INTEGER DEFAULT 1,
            wins INTEGER DEFAULT 0,
            gold_bank INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        """CREATE TABLE IF NOT EXISTS clan_members (
            user_id INTEGER PRIMARY KEY,
            clan_id INTEGER NOT NULL,
            role TEXT DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (clan_id) REFERENCES clans(id)
        )""",
        "ALTER TABLE players ADD COLUMN clan_id INTEGER",
        "CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members (clan_id)",
    ]),
    ("2026_04_10_001_level_one_based", [
        "UPDATE players SET level = 1 WHERE level = 0",
        "UPDATE bots SET level = 1 WHERE level = 0",
        "UPDATE pvp_queue SET level = 1 WHERE level = 0",
        "UPDATE players SET exp_milestones = 0",
    ]),
    ("2026_04_10_002_fix_level1_free_stats", [
        f"""UPDATE players
            SET free_stats = {PLAYER_START_FREE_STATS}
            WHERE level = 1
              AND exp = 0
              AND wins = 0
              AND losses = 0
              AND strength = {PLAYER_START_STRENGTH}
              AND endurance = {PLAYER_START_ENDURANCE}
              AND crit = {PLAYER_START_CRIT}
              AND free_stats = {PLAYER_START_FREE_STATS + stats_when_reaching_level(1)}""",
    ]),
    ("2026_04_11_001_player_inventory", [
        """CREATE TABLE IF NOT EXISTS player_inventory (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id  INTEGER NOT NULL REFERENCES players(user_id) ON DELETE CASCADE,
            item_id  TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1
        )""",
        "CREATE INDEX IF NOT EXISTS idx_inv_uid ON player_inventory(user_id)",
    ]),
    ("2026_04_11_002_player_buffs", [
        """CREATE TABLE IF NOT EXISTS player_buffs (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL REFERENCES players(user_id) ON DELETE CASCADE,
            buff_type  TEXT NOT NULL,
            value      INTEGER NOT NULL,
            charges    INTEGER,
            expires_at TEXT
        )""",
        "CREATE INDEX IF NOT EXISTS idx_pbuffs_uid ON player_buffs(user_id)",
    ]),
    ("2026_04_11_003_premium_box_claimed", [
        "ALTER TABLE players ADD COLUMN premium_box_claimed DATE",
    ]),
]
