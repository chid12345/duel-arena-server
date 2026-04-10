"""DDL: игроки, инвентарь, боты, бои, квесты, schema_migrations."""

from __future__ import annotations

# Без внешних ключей battles → players: в SQLite FK часто не проверялись, боты хранятся отдельно.
POSTGRES_DDL_01: tuple[str, ...] = (
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
        last_withdrawal_at TIMESTAMP,
        profile_reset_ts BIGINT DEFAULT 0
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
)
