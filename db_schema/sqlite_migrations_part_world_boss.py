"""SQLite migrations: Мировой босс (World Boss).

Содержит 4 таблицы:
- world_boss_spawns        — история рейдов (1 запись = 1 рейд каждые 4ч)
- world_boss_hits          — лог ударов игроков (для подсчёта вклада / топ-3)
- world_boss_player_state  — HP игрока в активном рейде + активные рейд-свитки
- world_boss_rewards       — незабранные награды (игрок забирает сам после боя)

Свитки воскрешения и рейд-свитки хранятся в существующей `inventory`
через item_type = 'resurrection_scroll' | 'raid_scroll'.

Также добавляет в players флаг `wb_reminder_opt_in` для кнопки «🔔 Напомни».
"""
from __future__ import annotations

MIGRATIONS_PART_WORLD_BOSS = [
    # 1. Таблица рейдов (спавны).
    ("2026_04_17_100_wb_spawns", [
        """CREATE TABLE IF NOT EXISTS world_boss_spawns (
            spawn_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            winner_last_hit_uid INTEGER,
            winner_top_damage_uid INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_wb_spawns_status ON world_boss_spawns (status)",
        "CREATE INDEX IF NOT EXISTS idx_wb_spawns_sched ON world_boss_spawns (scheduled_at)",
    ]),

    # 2. Лог ударов по боссу.
    ("2026_04_17_101_wb_hits", [
        """CREATE TABLE IF NOT EXISTS world_boss_hits (
            hit_id INTEGER PRIMARY KEY AUTOINCREMENT,
            spawn_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            damage INTEGER NOT NULL DEFAULT 0,
            is_crit INTEGER NOT NULL DEFAULT 0,
            is_vulnerability_window INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (spawn_id) REFERENCES world_boss_spawns (spawn_id),
            FOREIGN KEY (user_id) REFERENCES players (user_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_wb_hits_spawn_user ON world_boss_hits (spawn_id, user_id)",
        "CREATE INDEX IF NOT EXISTS idx_wb_hits_spawn_time ON world_boss_hits (spawn_id, created_at)",
    ]),

    # 3. Состояние игрока в активном рейде (HP, смерть, активные рейд-свитки).
    ("2026_04_17_102_wb_player_state", [
        """CREATE TABLE IF NOT EXISTS world_boss_player_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spawn_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
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
            UNIQUE(spawn_id, user_id),
            FOREIGN KEY (spawn_id) REFERENCES world_boss_spawns (spawn_id),
            FOREIGN KEY (user_id) REFERENCES players (user_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_wb_ps_spawn_dmg ON world_boss_player_state (spawn_id, total_damage DESC)",
    ]),

    # 4. Награды к получению (забираются игроком после конца рейда).
    ("2026_04_17_103_wb_rewards", [
        """CREATE TABLE IF NOT EXISTS world_boss_rewards (
            reward_id INTEGER PRIMARY KEY AUTOINCREMENT,
            spawn_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            gold INTEGER NOT NULL DEFAULT 0,
            exp INTEGER NOT NULL DEFAULT 0,
            diamonds INTEGER NOT NULL DEFAULT 0,
            chest_type TEXT,
            contribution_pct REAL NOT NULL DEFAULT 0.0,
            is_victory INTEGER NOT NULL DEFAULT 0,
            claimed INTEGER NOT NULL DEFAULT 0,
            claimed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(spawn_id, user_id),
            FOREIGN KEY (spawn_id) REFERENCES world_boss_spawns (spawn_id),
            FOREIGN KEY (user_id) REFERENCES players (user_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_wb_rewards_user_claimed ON world_boss_rewards (user_id, claimed)",
    ]),

    # 5. Флаг «Напомни за 5 мин до рейда» в players.
    ("2026_04_17_104_wb_reminder_flag", [
        "ALTER TABLE players ADD COLUMN wb_reminder_opt_in INTEGER DEFAULT 0",
    ]),

    # 6. Состояние боя: коронные удары (битовая маска) и время последней ответки.
    ("2026_04_17_105_wb_battle_state", [
        "ALTER TABLE world_boss_spawns ADD COLUMN crown_flags INTEGER DEFAULT 0",
        "ALTER TABLE world_boss_spawns ADD COLUMN last_boss_attack_at TIMESTAMP",
    ]),

    # 7. Cooldown 300 мс между ударами игрока — требует ms-точности
    # (SQLite CURRENT_TIMESTAMP округляет до секунды).
    ("2026_04_17_106_wb_hit_cooldown_ms", [
        "ALTER TABLE world_boss_player_state ADD COLUMN last_hit_ms INTEGER DEFAULT 0",
    ]),

    # 8. Флаг «анонс в чат за 5 мин отправлен» — анти-дубль (идемпотентность).
    ("2026_04_17_107_wb_announce_5min", [
        "ALTER TABLE world_boss_spawns ADD COLUMN announced_5min INTEGER DEFAULT 0",
    ]),
]
