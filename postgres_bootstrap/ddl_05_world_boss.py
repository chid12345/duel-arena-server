"""PostgreSQL DDL: Мировой босс — таблицы рейдов, ударов, состояния игроков, наград.
Все CREATE/ALTER с IF NOT EXISTS — безопасно на существующей БД.
"""

from __future__ import annotations

POSTGRES_DDL_05_WORLD_BOSS: tuple[str, ...] = (
    # 1. Рейды (спавны)
    """
    CREATE TABLE IF NOT EXISTS world_boss_spawns (
        spawn_id SERIAL PRIMARY KEY,
        boss_name TEXT NOT NULL DEFAULT 'Titan',
        boss_type TEXT NOT NULL DEFAULT 'universal',
        max_hp INTEGER NOT NULL DEFAULT 10000,
        current_hp INTEGER NOT NULL DEFAULT 10000,
        stat_profile TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'scheduled',
        scheduled_at TIMESTAMP NOT NULL,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        online_at_start INTEGER DEFAULT 0,
        total_participants INTEGER DEFAULT 0,
        winner_last_hit_uid BIGINT,
        winner_top_damage_uid BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        crown_flags INTEGER DEFAULT 0,
        last_boss_attack_at TIMESTAMP,
        announced_5min INTEGER DEFAULT 0,
        reminders_sent_5min INTEGER DEFAULT 0,
        stage INTEGER DEFAULT 1
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_wb_spawns_status ON world_boss_spawns (status)",
    "CREATE INDEX IF NOT EXISTS idx_wb_spawns_sched ON world_boss_spawns (scheduled_at)",

    # 2. Лог ударов
    """
    CREATE TABLE IF NOT EXISTS world_boss_hits (
        hit_id SERIAL PRIMARY KEY,
        spawn_id INTEGER NOT NULL REFERENCES world_boss_spawns (spawn_id),
        user_id BIGINT NOT NULL REFERENCES players (user_id),
        damage INTEGER NOT NULL DEFAULT 0,
        is_crit INTEGER NOT NULL DEFAULT 0,
        is_vulnerability_window INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_wb_hits_spawn_user ON world_boss_hits (spawn_id, user_id)",
    "CREATE INDEX IF NOT EXISTS idx_wb_hits_spawn_time ON world_boss_hits (spawn_id, created_at)",

    # 3. Состояние игрока в рейде
    """
    CREATE TABLE IF NOT EXISTS world_boss_player_state (
        id SERIAL PRIMARY KEY,
        spawn_id INTEGER NOT NULL REFERENCES world_boss_spawns (spawn_id),
        user_id BIGINT NOT NULL REFERENCES players (user_id),
        current_hp INTEGER NOT NULL DEFAULT 100,
        max_hp INTEGER NOT NULL DEFAULT 100,
        is_dead INTEGER NOT NULL DEFAULT 0,
        died_at TIMESTAMP,
        total_damage INTEGER NOT NULL DEFAULT 0,
        hits_count INTEGER NOT NULL DEFAULT 0,
        raid_scroll_1 TEXT,
        raid_scroll_2 TEXT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_hit_at TIMESTAMP,
        last_hit_ms BIGINT DEFAULT 0,
        endurance INTEGER DEFAULT 3,
        crit INTEGER DEFAULT 3,
        UNIQUE(spawn_id, user_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_wb_ps_spawn_dmg ON world_boss_player_state (spawn_id, total_damage DESC)",

    # 4. Награды
    """
    CREATE TABLE IF NOT EXISTS world_boss_rewards (
        reward_id SERIAL PRIMARY KEY,
        spawn_id INTEGER NOT NULL REFERENCES world_boss_spawns (spawn_id),
        user_id BIGINT NOT NULL REFERENCES players (user_id),
        gold INTEGER NOT NULL DEFAULT 0,
        exp INTEGER NOT NULL DEFAULT 0,
        diamonds INTEGER NOT NULL DEFAULT 0,
        chest_type TEXT,
        contribution_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        is_victory INTEGER NOT NULL DEFAULT 0,
        claimed BOOLEAN NOT NULL DEFAULT FALSE,
        claimed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(spawn_id, user_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_wb_rewards_user_claimed ON world_boss_rewards (user_id, claimed)",

    # 5. Флаг напоминания в players
    "ALTER TABLE players ADD COLUMN IF NOT EXISTS wb_reminder_opt_in INTEGER DEFAULT 0",

    # 6. Предварительная регистрация на рейд
    """
    CREATE TABLE IF NOT EXISTS world_boss_registrations (
        id SERIAL PRIMARY KEY,
        spawn_id INTEGER NOT NULL REFERENCES world_boss_spawns (spawn_id),
        user_id BIGINT NOT NULL REFERENCES players (user_id),
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(spawn_id, user_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_wb_reg_spawn ON world_boss_registrations (spawn_id)",

    # 7. Авто-бой из лобби: тогл «бот заходит за меня».
    "ALTER TABLE players ADD COLUMN IF NOT EXISTS wb_auto_bot_pending INTEGER DEFAULT 0",
    "ALTER TABLE world_boss_player_state ADD COLUMN IF NOT EXISTS auto_bot INTEGER DEFAULT 0",

    # 8. Щит игрока (-30% урона на 2 сек). Timestamp в мс окончания.
    "ALTER TABLE world_boss_player_state ADD COLUMN IF NOT EXISTS shield_until_ms BIGINT DEFAULT 0",
)
