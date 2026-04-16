"""SQLite migrations: Clan v2 — эмблемы, описание, клан-XP, сезоны, заявки,
достижения, история, войны, авто-кик."""
from __future__ import annotations

MIGRATIONS_PART_CLAN_V2 = [
    # 1. Поля эмблемы / описания / min_level / clan_xp / сезон в clans
    ("2026_04_17_001_clan_v2_fields", [
        "ALTER TABLE clans ADD COLUMN emblem TEXT DEFAULT 'neutral'",
        "ALTER TABLE clans ADD COLUMN min_level INTEGER DEFAULT 1",
        "ALTER TABLE clans ADD COLUMN closed INTEGER DEFAULT 0",
        "ALTER TABLE clans ADD COLUMN clan_xp INTEGER DEFAULT 0",
        "ALTER TABLE clans ADD COLUMN season_score INTEGER DEFAULT 0",
        "ALTER TABLE clans ADD COLUMN season_id INTEGER DEFAULT 0",
        "ALTER TABLE clans ADD COLUMN weekly_wins INTEGER DEFAULT 0",
        "ALTER TABLE clans ADD COLUMN weekly_started_at TEXT",
        "UPDATE clans SET emblem = 'neutral' WHERE emblem IS NULL",
    ]),

    # 2. last_active_at для участников (для "онлайн" и авто-кика)
    ("2026_04_17_002_clan_members_active", [
        "ALTER TABLE clan_members ADD COLUMN last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    ]),

    # 3. Заявки на вступление
    ("2026_04_17_003_clan_join_requests", [
        """CREATE TABLE IF NOT EXISTS clan_join_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clan_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT DEFAULT '',
            level INTEGER DEFAULT 1,
            wins INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(clan_id, user_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_cjr_clan_status ON clan_join_requests (clan_id, status)",
    ]),

    # 4. Клан-достижения
    ("2026_04_17_004_clan_achievements", [
        """CREATE TABLE IF NOT EXISTS clan_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clan_id INTEGER NOT NULL,
            achievement_key TEXT NOT NULL,
            unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(clan_id, achievement_key)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_cach_clan ON clan_achievements (clan_id)",
    ]),

    # 5. История клана (лента событий)
    ("2026_04_17_005_clan_history", [
        """CREATE TABLE IF NOT EXISTS clan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clan_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            actor_id INTEGER,
            actor_name TEXT DEFAULT '',
            extra TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_chist_clan ON clan_history (clan_id, created_at)",
    ]),

    # 6. Клан-войны
    ("2026_04_17_006_clan_wars", [
        """CREATE TABLE IF NOT EXISTS clan_wars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clan_a INTEGER NOT NULL,
            clan_b INTEGER NOT NULL,
            score_a INTEGER DEFAULT 0,
            score_b INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            started_at TIMESTAMP,
            ends_at TIMESTAMP,
            winner_clan INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_cwars_status ON clan_wars (status)",
        "CREATE INDEX IF NOT EXISTS idx_cwars_a ON clan_wars (clan_a, status)",
        "CREATE INDEX IF NOT EXISTS idx_cwars_b ON clan_wars (clan_b, status)",
    ]),

    # 7. Сезоны клана
    ("2026_04_17_007_clan_seasons", [
        """CREATE TABLE IF NOT EXISTS clan_seasons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at TIMESTAMP NOT NULL,
            ends_at TIMESTAMP NOT NULL,
            ended INTEGER DEFAULT 0
        )""",
        "CREATE INDEX IF NOT EXISTS idx_cseasons_ended ON clan_seasons (ended, ends_at)",
    ]),

    # 8. Ежедневные/недельные задания клана
    ("2026_04_17_008_clan_tasks", [
        """CREATE TABLE IF NOT EXISTS clan_tasks (
            clan_id INTEGER NOT NULL,
            task_key TEXT NOT NULL,
            progress INTEGER DEFAULT 0,
            target INTEGER DEFAULT 0,
            period TEXT DEFAULT 'daily',
            period_started_at TEXT,
            completed INTEGER DEFAULT 0,
            PRIMARY KEY (clan_id, task_key, period)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_ctasks_clan ON clan_tasks (clan_id, period)",
    ]),
]
