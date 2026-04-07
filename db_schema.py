"""
db_schema.py — инициализация схемы БД: CREATE TABLE, индексы, миграции.
Не содержит бизнес-логики — только DDL.
"""

from __future__ import annotations

import logging
from config import PLAYER_START_FREE_STATS, PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE, \
    PLAYER_START_CRIT, stats_when_reaching_level

_log = logging.getLogger(__name__)


class DBSchema:
    """Mixin: инициализация и миграция схемы БД."""

    # Сериализация bootstrap схемы PostgreSQL (устраняет гонки CREATE TABLE/TYPE при параллельном старте).
    _ADV_PG_SCHEMA_K1 = 428470
    _ADV_PG_SCHEMA_K2 = 921002
    _ADV_PG_INIT_K1   = 428471
    _ADV_PG_INIT_K2   = 921003

    def init_database(self):
        """Инициализация всех таблиц."""
        if self._pg:
            from postgres_bootstrap import bootstrap_postgres_schema
            conn = self.get_connection()
            cursor = conn.cursor()
            schema_lock_held = False
            lock_held = False
            try:
                cursor.execute(
                    "SELECT pg_advisory_lock(%s, %s)",
                    (self._ADV_PG_SCHEMA_K1, self._ADV_PG_SCHEMA_K2),
                )
                schema_lock_held = True
                try:
                    bootstrap_postgres_schema(cursor)
                    conn.commit()
                finally:
                    ucur = conn.cursor()
                    ucur.execute(
                        "SELECT pg_advisory_unlock(%s, %s)",
                        (self._ADV_PG_SCHEMA_K1, self._ADV_PG_SCHEMA_K2),
                    )
                    conn.commit()
                    schema_lock_held = False

                cursor.execute(
                    "SELECT pg_try_advisory_lock(%s, %s)",
                    (self._ADV_PG_INIT_K1, self._ADV_PG_INIT_K2),
                )
                row = cursor.fetchone()
                lock_held = bool(row and next(iter(row.values())))
                if lock_held:
                    self.create_initial_bots(conn)
                    self.rebalance_all_bots(conn)
            finally:
                if schema_lock_held:
                    try:
                        ucur = conn.cursor()
                        ucur.execute(
                            "SELECT pg_advisory_unlock(%s, %s)",
                            (self._ADV_PG_SCHEMA_K1, self._ADV_PG_SCHEMA_K2),
                        )
                        conn.commit()
                    except Exception:
                        pass
                if lock_held:
                    try:
                        ucur = conn.cursor()
                        ucur.execute(
                            "SELECT pg_advisory_unlock(%s, %s)",
                            (self._ADV_PG_INIT_K1, self._ADV_PG_INIT_K2),
                        )
                        conn.commit()
                    except Exception:
                        pass
                conn.close()
            return

        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS players (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                level INTEGER DEFAULT 0,
                exp INTEGER DEFAULT 0,
                strength INTEGER DEFAULT 10,
                endurance INTEGER DEFAULT 10,
                max_hp INTEGER DEFAULT 100,
                current_hp INTEGER DEFAULT 100,
                gold INTEGER DEFAULT 0,
                diamonds INTEGER DEFAULT 0,
                free_stats INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                rating INTEGER DEFAULT 1000,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                daily_streak INTEGER DEFAULT 0,
                last_daily DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS improvements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                improvement_type TEXT,
                level INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                item_name TEXT,
                item_type TEXT,
                item_value INTEGER,
                quantity INTEGER DEFAULT 1,
                is_premium BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bots (
                bot_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                level INTEGER,
                strength INTEGER,
                endurance INTEGER,
                max_hp INTEGER,
                current_hp INTEGER,
                bot_type TEXT,
                ai_pattern TEXT,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                battles_count INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS battles (
                battle_id INTEGER PRIMARY KEY AUTOINCREMENT,
                player1_id INTEGER,
                player2_id INTEGER,
                is_bot1 BOOLEAN DEFAULT 0,
                is_bot2 BOOLEAN DEFAULT 0,
                winner_id INTEGER,
                battle_result TEXT,
                rounds_played INTEGER,
                battle_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player1_id) REFERENCES players (user_id),
                FOREIGN KEY (player2_id) REFERENCES players (user_id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                achievement_name TEXT,
                achievement_data TEXT,
                completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_bonuses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                bonus_date DATE,
                bonus_type TEXT,
                bonus_value INTEGER,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metric_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                user_id INTEGER,
                value INTEGER DEFAULT 0,
                duration_ms INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_quests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                quest_date DATE NOT NULL,
                battles_played INTEGER DEFAULT 0,
                battles_won INTEGER DEFAULT 0,
                reward_claimed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, quest_date)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pvp_challenges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                challenger_id INTEGER NOT NULL,
                target_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                expires_at INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pvp_ch_target_status ON pvp_challenges (target_id, status, created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_pvp_ch_challenger_status ON pvp_challenges (challenger_id, status, created_at)")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS titan_progress (
                user_id INTEGER PRIMARY KEY,
                best_floor INTEGER DEFAULT 0,
                current_floor INTEGER DEFAULT 1,
                weekly_best_floor INTEGER DEFAULT 0,
                weekly_best_at INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_titan_weekly_best ON titan_progress (weekly_best_floor DESC, weekly_best_at ASC)")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS weekly_claims (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                week_key TEXT NOT NULL,
                claim_key TEXT NOT NULL,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, week_key, claim_key)
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_weekly_claims_user_week ON weekly_claims (user_id, week_key)")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schema_migrations (
                migration_id TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        self._apply_migrations(cursor)
        conn.commit()
        conn.close()

        self.create_initial_bots()
        self.rebalance_all_bots()

    def _apply_migrations(self, cursor):
        """Применить встроенные миграции для SQLite."""
        migrations = [
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
            ("2026_04_11_001_hp_regen", [
                "ALTER TABLE players ADD COLUMN last_hp_regen TEXT DEFAULT NULL",
            ]),
            ("2026_04_11_002_sync_last_hp_regen_all", [
                "UPDATE players SET last_hp_regen = strftime('%Y-%m-%dT%H:%M:%S', 'now')",
            ]),
            ("2026_04_13_000a_premium_subscription", [
                "ALTER TABLE players ADD COLUMN premium_until TEXT DEFAULT NULL",
            ]),
            ("2026_04_13_000_stars_payments", [
                """CREATE TABLE IF NOT EXISTS stars_payments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    package_id TEXT NOT NULL,
                    diamonds INTEGER NOT NULL DEFAULT 0,
                    stars INTEGER NOT NULL DEFAULT 0,
                    source TEXT NOT NULL DEFAULT 'tma',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                "CREATE INDEX IF NOT EXISTS idx_stars_payments_user ON stars_payments (user_id, created_at)",
            ]),
            ("2026_04_13_001_crypto_invoices", [
                """CREATE TABLE IF NOT EXISTS crypto_invoices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    invoice_id INTEGER UNIQUE NOT NULL,
                    user_id INTEGER NOT NULL,
                    diamonds INTEGER NOT NULL DEFAULT 0,
                    asset TEXT NOT NULL DEFAULT 'TON',
                    amount TEXT NOT NULL DEFAULT '0',
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    paid_at TIMESTAMP
                )""",
                "CREATE INDEX IF NOT EXISTS idx_crypto_invoices_user ON crypto_invoices (user_id)",
                "CREATE INDEX IF NOT EXISTS idx_crypto_invoices_status ON crypto_invoices (status, created_at)",
            ]),
            ("2026_04_12_001_referral_payouts", [
                "ALTER TABLE players ADD COLUMN referral_subscriber_rank INTEGER",
                "ALTER TABLE players ADD COLUMN referral_tier TEXT",
                "ALTER TABLE players ADD COLUMN first_premium_at TEXT",
                """CREATE TABLE IF NOT EXISTS referral_rewards (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    referrer_id INTEGER NOT NULL,
                    buyer_id INTEGER NOT NULL,
                    reward_type TEXT NOT NULL,
                    percent INTEGER,
                    base_stars INTEGER DEFAULT 0,
                    base_gold INTEGER DEFAULT 0,
                    base_diamonds INTEGER DEFAULT 0,
                    reward_diamonds INTEGER DEFAULT 0,
                    reward_gold INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                "CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards (referrer_id)",
            ]),
            ("2026_04_15_001_clan_chat", [
                """CREATE TABLE IF NOT EXISTS clan_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    clan_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    username TEXT NOT NULL DEFAULT '',
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                "CREATE INDEX IF NOT EXISTS idx_clan_messages_clan ON clan_messages (clan_id, created_at)",
            ]),
            ("2026_04_05_002_referral_usdt", [
                "ALTER TABLE players ADD COLUMN referral_usdt_balance REAL DEFAULT 0",
                "ALTER TABLE referral_rewards ADD COLUMN reward_usdt REAL DEFAULT 0",
                """CREATE TABLE IF NOT EXISTS referral_withdrawals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    amount REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    telegram_username TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP
                )""",
                "CREATE INDEX IF NOT EXISTS idx_ref_withdrawals_user ON referral_withdrawals (user_id)",
            ]),
            ("2026_04_05_003_withdrawal_cooldown", [
                "ALTER TABLE players ADD COLUMN last_withdrawal_at TIMESTAMP",
            ]),
            ("2026_04_16_001_pvp_challenges", [
                """CREATE TABLE IF NOT EXISTS pvp_challenges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    challenger_id INTEGER NOT NULL,
                    target_id INTEGER NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    expires_at INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""",
                "CREATE INDEX IF NOT EXISTS idx_pvp_ch_target_status ON pvp_challenges (target_id, status, created_at)",
                "CREATE INDEX IF NOT EXISTS idx_pvp_ch_challenger_status ON pvp_challenges (challenger_id, status, created_at)",
            ]),
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
        ]

        for migration_id, statements in migrations:
            cursor.execute(
                "SELECT 1 FROM schema_migrations WHERE migration_id = ?",
                (migration_id,),
            )
            if cursor.fetchone():
                continue
            for statement in statements:
                try:
                    cursor.execute(statement)
                except Exception as stmt_err:
                    _log.warning(
                        "Migration %s stmt skipped: %s | %s", migration_id, stmt_err, statement[:80]
                    )
            cursor.execute(
                "INSERT INTO schema_migrations (migration_id) VALUES (?)",
                (migration_id,),
            )
