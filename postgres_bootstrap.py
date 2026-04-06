"""
Одноразовая инициализация схемы PostgreSQL (Supabase / Render).
SQLite-миграции не выполняются: схема создаётся целиком, затем помечаются все migration_id.
"""

from __future__ import annotations

# Порядок и состав совпадают с _apply_migrations в database.py (на момент введения PG).
POSTGRES_MIGRATION_IDS: tuple[str, ...] = (
    "2026_04_02_001_add_hot_indexes",
    "2026_04_03_001_player_win_streak",
    "2026_04_03_002_progression_crit_milestones",
    "2026_04_03_003_level_zero_based",
    "2026_04_03_004_battle_energy",
    "2026_04_04_001_bots_crit",
    "2026_04_05_001_generous_energy",
    "2026_04_06_001_global_progress_reset",
    "2026_04_07_001_seed_bots_level_zero",
    "2026_04_08_001_null_crit_defaults",
    "2026_04_09_001_drop_energy_columns",
    "2026_04_09_002_referral_system",
    "2026_04_09_003_chat_id_and_pvp",
    "2026_04_09_004_seasons",
    "2026_04_09_005_shop_buffs",
    "2026_04_09_006_battle_pass",
    "2026_04_09_007_clans",
    "2026_04_10_001_level_one_based",
    "2026_04_10_002_fix_level1_free_stats",
    "2026_04_11_001_hp_regen",
    "2026_04_11_002_sync_last_hp_regen_all",
    "2026_04_13_000a_premium_subscription",
    "2026_04_13_000_stars_payments",
    "2026_04_13_001_crypto_invoices",
    "2026_04_12_001_referral_payouts",
    "2026_04_15_001_clan_chat",
    "2026_04_05_002_referral_usdt",
    "2026_04_05_003_withdrawal_cooldown",
    "2026_04_16_001_pvp_challenges",
    "2026_04_16_002_titan_and_weekly_claims",
)

# Без внешних ключей battles → players: в SQLite FK часто не проверялись, боты хранятся отдельно.
POSTGRES_DDL_STATEMENTS: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS players (
        user_id BIGINT PRIMARY KEY,
        username TEXT,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        strength INTEGER DEFAULT 10,
        endurance INTEGER DEFAULT 10,
        crit INTEGER DEFAULT 3,
        exp_milestones INTEGER DEFAULT 0,
        max_hp INTEGER DEFAULT 100,
        current_hp INTEGER DEFAULT 100,
        gold INTEGER DEFAULT 0,
        diamonds INTEGER DEFAULT 0,
        free_stats INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        win_streak INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 1000,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        daily_streak INTEGER DEFAULT 0,
        last_daily DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        referral_code TEXT,
        referred_by TEXT,
        chat_id BIGINT,
        clan_id INTEGER,
        xp_boost_charges INTEGER DEFAULT 0,
        last_hp_regen TEXT,
        premium_until TEXT,
        referral_subscriber_rank INTEGER,
        referral_tier TEXT,
        first_premium_at TEXT,
        referral_usdt_balance DOUBLE PRECISION DEFAULT 0,
        last_withdrawal_at TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS improvements (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES players (user_id),
        improvement_type TEXT,
        level INTEGER DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES players (user_id),
        item_name TEXT,
        item_type TEXT,
        item_value INTEGER,
        quantity INTEGER DEFAULT 1,
        is_premium BOOLEAN DEFAULT FALSE
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bots (
        bot_id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        level INTEGER,
        strength INTEGER,
        endurance INTEGER,
        crit INTEGER DEFAULT 3,
        max_hp INTEGER,
        current_hp INTEGER,
        bot_type TEXT,
        ai_pattern TEXT,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        battles_count INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS battles (
        battle_id SERIAL PRIMARY KEY,
        player1_id BIGINT,
        player2_id BIGINT,
        is_bot1 BOOLEAN DEFAULT FALSE,
        is_bot2 BOOLEAN DEFAULT FALSE,
        winner_id BIGINT,
        battle_result TEXT,
        rounds_played INTEGER,
        battle_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES players (user_id),
        achievement_name TEXT,
        achievement_data TEXT,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS daily_bonuses (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES players (user_id),
        bonus_date DATE,
        bonus_type TEXT,
        bonus_value INTEGER,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS metric_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        user_id BIGINT,
        value INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS daily_quests (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        quest_date DATE NOT NULL,
        battles_played INTEGER DEFAULT 0,
        battles_won INTEGER DEFAULT 0,
        reward_claimed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, quest_date)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        referral_code TEXT NOT NULL,
        referrer_id BIGINT NOT NULL,
        referred_id BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (referred_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pvp_queue (
        user_id BIGINT PRIMARY KEY,
        level INTEGER NOT NULL,
        chat_id BIGINT NOT NULL,
        message_id BIGINT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS pvp_challenges (
        id SERIAL PRIMARY KEY,
        challenger_id BIGINT NOT NULL,
        target_id BIGINT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS titan_progress (
        user_id BIGINT PRIMARY KEY,
        best_floor INTEGER DEFAULT 0,
        current_floor INTEGER DEFAULT 1,
        weekly_best_floor INTEGER DEFAULT 0,
        weekly_best_at BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS weekly_claims (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        week_key TEXT NOT NULL,
        claim_key TEXT NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, week_key, claim_key)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS seasons (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS season_stats (
        id SERIAL PRIMARY KEY,
        season_id INTEGER NOT NULL REFERENCES seasons (id),
        user_id BIGINT NOT NULL,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 1000,
        UNIQUE (season_id, user_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS season_rewards (
        id SERIAL PRIMARY KEY,
        season_id INTEGER NOT NULL REFERENCES seasons (id),
        user_id BIGINT NOT NULL,
        rank INTEGER,
        diamonds INTEGER DEFAULT 0,
        reward_title TEXT,
        claimed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS battle_pass (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        season_id INTEGER NOT NULL DEFAULT 1 REFERENCES seasons (id),
        battles_done INTEGER DEFAULT 0,
        wins_done INTEGER DEFAULT 0,
        streak_done INTEGER DEFAULT 0,
        last_claimed_tier INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, season_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS clans (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        tag TEXT UNIQUE NOT NULL,
        leader_id BIGINT NOT NULL,
        description TEXT DEFAULT '',
        level INTEGER DEFAULT 1,
        wins INTEGER DEFAULT 0,
        gold_bank INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS clan_members (
        user_id BIGINT PRIMARY KEY,
        clan_id INTEGER NOT NULL REFERENCES clans (id),
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS stars_payments (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        package_id TEXT NOT NULL,
        diamonds INTEGER NOT NULL DEFAULT 0,
        stars INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'tma',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS crypto_invoices (
        id SERIAL PRIMARY KEY,
        invoice_id BIGINT UNIQUE NOT NULL,
        user_id BIGINT NOT NULL,
        diamonds INTEGER NOT NULL DEFAULT 0,
        asset TEXT NOT NULL DEFAULT 'TON',
        amount TEXT NOT NULL DEFAULT '0',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS referral_rewards (
        id SERIAL PRIMARY KEY,
        referrer_id BIGINT NOT NULL,
        buyer_id BIGINT NOT NULL,
        reward_type TEXT NOT NULL,
        percent INTEGER,
        base_stars INTEGER DEFAULT 0,
        base_gold INTEGER DEFAULT 0,
        base_diamonds INTEGER DEFAULT 0,
        reward_diamonds INTEGER DEFAULT 0,
        reward_gold INTEGER DEFAULT 0,
        reward_usdt DOUBLE PRECISION DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS referral_withdrawals (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        telegram_username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS clan_messages (
        id SERIAL PRIMARY KEY,
        clan_id INTEGER NOT NULL REFERENCES clans (id),
        user_id BIGINT NOT NULL,
        username TEXT NOT NULL DEFAULT '',
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    # Индексы (как в миграциях SQLite)
    "CREATE INDEX IF NOT EXISTS idx_players_rating ON players (rating DESC)",
    "CREATE INDEX IF NOT EXISTS idx_players_last_active ON players (last_active)",
    "CREATE INDEX IF NOT EXISTS idx_bots_level ON bots (level)",
    "CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles (created_at)",
    "CREATE INDEX IF NOT EXISTS idx_battles_player1_id ON battles (player1_id)",
    "CREATE INDEX IF NOT EXISTS idx_battles_player2_id ON battles (player2_id)",
    "CREATE INDEX IF NOT EXISTS idx_metric_events_type_time ON metric_events (event_type, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_metric_events_user_time ON metric_events (user_id, created_at)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_improvements_user_type ON improvements (user_id, improvement_type)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_referral_code ON players (referral_code) WHERE referral_code IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id)",
    "CREATE INDEX IF NOT EXISTS idx_pvp_queue_level ON pvp_queue (level)",
    "CREATE INDEX IF NOT EXISTS idx_pvp_ch_target_status ON pvp_challenges (target_id, status, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_pvp_ch_challenger_status ON pvp_challenges (challenger_id, status, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_titan_weekly_best ON titan_progress (weekly_best_floor DESC, weekly_best_at ASC)",
    "CREATE INDEX IF NOT EXISTS idx_weekly_claims_user_week ON weekly_claims (user_id, week_key)",
    "CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members (clan_id)",
    "CREATE INDEX IF NOT EXISTS idx_stars_payments_user ON stars_payments (user_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_crypto_invoices_user ON crypto_invoices (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_crypto_invoices_status ON crypto_invoices (status, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards (referrer_id)",
    "CREATE INDEX IF NOT EXISTS idx_clan_messages_clan ON clan_messages (clan_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_ref_withdrawals_user ON referral_withdrawals (user_id)",
)

POSTGRES_AFTER_DDL: tuple[str, ...] = (
    "INSERT INTO seasons (id, name, status) VALUES (1, 'Сезон 1: Начало', 'active') ON CONFLICT (id) DO NOTHING",
    "SELECT setval(pg_get_serial_sequence('seasons', 'id'), COALESCE((SELECT MAX(id) FROM seasons), 1), true)",
)


def bootstrap_postgres_schema(cursor) -> None:
    """Выполнить DDL и отметить все миграции применёнными (новая пустая БД)."""
    for stmt in POSTGRES_DDL_STATEMENTS:
        cursor.execute(stmt.strip())
    for stmt in POSTGRES_AFTER_DDL:
        cursor.execute(stmt)
    for mid in POSTGRES_MIGRATION_IDS:
        cursor.execute(
            "INSERT INTO schema_migrations (migration_id) VALUES (%s) ON CONFLICT (migration_id) DO NOTHING",
            (mid,),
        )
