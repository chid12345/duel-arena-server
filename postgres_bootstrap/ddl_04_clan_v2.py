"""PostgreSQL DDL: Clan v2 — эмблемы, описание, клан-XP, сезоны, заявки,
достижения, история, войны, авто-кик. Все ALTER/CREATE с IF NOT EXISTS,
чтобы безопасно прогонялись и на свежей и на существующей схеме.
"""

from __future__ import annotations

POSTGRES_DDL_04_CLAN_V2: tuple[str, ...] = (
    # 1. Поля clans
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS emblem TEXT DEFAULT 'neutral'",
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS min_level INTEGER DEFAULT 1",
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS closed INTEGER DEFAULT 0",
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS clan_xp INTEGER DEFAULT 0",
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS season_score INTEGER DEFAULT 0",
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS season_id INTEGER DEFAULT 0",
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS weekly_wins INTEGER DEFAULT 0",
    "ALTER TABLE clans ADD COLUMN IF NOT EXISTS weekly_started_at TEXT",
    "UPDATE clans SET emblem = 'neutral' WHERE emblem IS NULL",

    # 2. last_active_at для clan_members
    "ALTER TABLE clan_members ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",

    # 3. Заявки на вступление
    """
    CREATE TABLE IF NOT EXISTS clan_join_requests (
        id SERIAL PRIMARY KEY,
        clan_id INTEGER NOT NULL REFERENCES clans (id),
        user_id BIGINT NOT NULL,
        username TEXT DEFAULT '',
        level INTEGER DEFAULT 1,
        wins INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(clan_id, user_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_cjr_clan_status ON clan_join_requests (clan_id, status)",

    # 4. Достижения клана
    """
    CREATE TABLE IF NOT EXISTS clan_achievements (
        id SERIAL PRIMARY KEY,
        clan_id INTEGER NOT NULL REFERENCES clans (id),
        achievement_key TEXT NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(clan_id, achievement_key)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_cach_clan ON clan_achievements (clan_id)",

    # 5. История клана
    """
    CREATE TABLE IF NOT EXISTS clan_history (
        id SERIAL PRIMARY KEY,
        clan_id INTEGER NOT NULL REFERENCES clans (id),
        event_type TEXT NOT NULL,
        actor_id BIGINT,
        actor_name TEXT DEFAULT '',
        extra TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_chist_clan ON clan_history (clan_id, created_at)",

    # 6. Клан-войны
    """
    CREATE TABLE IF NOT EXISTS clan_wars (
        id SERIAL PRIMARY KEY,
        clan_a INTEGER NOT NULL REFERENCES clans (id),
        clan_b INTEGER NOT NULL REFERENCES clans (id),
        score_a INTEGER DEFAULT 0,
        score_b INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        started_at TIMESTAMP,
        ends_at TIMESTAMP,
        winner_clan INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_cwars_status ON clan_wars (status)",
    "CREATE INDEX IF NOT EXISTS idx_cwars_a ON clan_wars (clan_a, status)",
    "CREATE INDEX IF NOT EXISTS idx_cwars_b ON clan_wars (clan_b, status)",

    # 7. Сезоны
    """
    CREATE TABLE IF NOT EXISTS clan_seasons (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        ended INTEGER DEFAULT 0
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_cseasons_ended ON clan_seasons (ended, ends_at)",

    # 8. Задания клана
    """
    CREATE TABLE IF NOT EXISTS clan_tasks (
        clan_id INTEGER NOT NULL REFERENCES clans (id),
        task_key TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        target INTEGER DEFAULT 0,
        period TEXT DEFAULT 'daily',
        period_started_at TEXT,
        completed INTEGER DEFAULT 0,
        PRIMARY KEY (clan_id, task_key, period)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_ctasks_clan ON clan_tasks (clan_id, period)",
)
