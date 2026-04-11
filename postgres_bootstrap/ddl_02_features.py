"""DDL: рефералы, PvP, титаны, сезоны, кланы, платежи, клан-чат."""

from __future__ import annotations

POSTGRES_DDL_02: tuple[str, ...] = (
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
        run_active INTEGER DEFAULT 0,
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
        payload TEXT NOT NULL DEFAULT '',
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
)
