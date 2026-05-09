"""DDL для сезонов и батл-пасса (Шаг 5)."""
from __future__ import annotations

POSTGRES_DDL_06_SEASON_PASS: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS bp_seasons (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        theme TEXT NOT NULL DEFAULT 'fire',
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ends_at TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_bp_seasons_active ON bp_seasons (is_active, ends_at)",

    """
    CREATE TABLE IF NOT EXISTS bp_progress (
        user_id BIGINT NOT NULL,
        season_id INTEGER NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 0,
        has_premium BOOLEAN NOT NULL DEFAULT FALSE,
        premium_purchased_at TIMESTAMP NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, season_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_bp_progress_user ON bp_progress (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_bp_progress_season ON bp_progress (season_id, level)",

    """
    CREATE TABLE IF NOT EXISTS bp_rewards_claimed (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        season_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        track TEXT NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, season_id, level, track)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_bp_claimed_user ON bp_rewards_claimed (user_id, season_id)",
)
