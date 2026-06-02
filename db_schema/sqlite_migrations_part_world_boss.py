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

    # 9. Флаг «индивидуальные пуши за 5 мин отправлены» — анти-дубль.
    ("2026_04_17_108_wb_reminders_sent_5min", [
        "ALTER TABLE world_boss_spawns ADD COLUMN reminders_sent_5min INTEGER DEFAULT 0",
    ]),

    # 10. Стадия рейда: 1 = обычная, 2 = ярость (триггер на 50% HP). Фаза 2.3.
    ("2026_04_17_109_wb_stage", [
        "ALTER TABLE world_boss_spawns ADD COLUMN stage INTEGER DEFAULT 1",
    ]),

    # 11. Статы игрока для расчёта уворота (endurance) и крита (crit) в рейде —
    #     снимаются при входе в рейд, хранятся локально чтобы battle_tick не лез в players.
    ("2026_04_18_110_wb_player_combat_stats", [
        "ALTER TABLE world_boss_player_state ADD COLUMN endurance INTEGER DEFAULT 3",
        "ALTER TABLE world_boss_player_state ADD COLUMN crit INTEGER DEFAULT 3",
    ]),

    # 12. Предварительная регистрация на рейд (за 5 мин до старта).
    ("2026_04_18_111_wb_registrations", [
        """CREATE TABLE IF NOT EXISTS world_boss_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            spawn_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(spawn_id, user_id),
            FOREIGN KEY (spawn_id) REFERENCES world_boss_spawns (spawn_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_wb_reg_spawn ON world_boss_registrations (spawn_id)",
    ]),

    # 13. Тип claimed в PostgreSQL: INTEGER → BOOLEAN.
    #     sql_adapt.py конвертирует claimed=0 → claimed=FALSE, поэтому тип должен быть BOOLEAN.
    #     SQLite тихо пропускает ALTER COLUMN TYPE (не поддерживает), оставляет INTEGER — это норм.
    ("2026_04_19_112_wb_rewards_claimed_boolean", [
        "ALTER TABLE world_boss_rewards ALTER COLUMN claimed TYPE BOOLEAN USING claimed::boolean",
    ]),

    # 14. Retry: 112 мог быть помечен как применённый даже при сбое транзакции.
    #     Новый ключ гарантирует повторную попытку. Идемпотентно — повторный ALTER не ломает.
    ("2026_04_19_113_wb_claimed_bool_retry2", [
        "ALTER TABLE world_boss_rewards ALTER COLUMN claimed TYPE BOOLEAN USING claimed::boolean",
    ]),

    # 15. Авто-бой из лобби: бот заходит в рейд если игрок офлайн.
    #     wb_auto_bot_pending — флаг «включил тогл в лобби», сбрасывается при старте рейда.
    #     auto_bot — у конкретного player_state, означает что этот участник — бот (награда ×0.5).
    ("2026_04_27_114_wb_auto_bot", [
        "ALTER TABLE players ADD COLUMN wb_auto_bot_pending INTEGER DEFAULT 0",
        "ALTER TABLE world_boss_player_state ADD COLUMN auto_bot INTEGER DEFAULT 0",
    ]),

    # 16. Щит игрока в рейде: timestamp в мс когда заканчивается активный щит.
    #     Если now_ms < shield_until_ms → boss damage × 0.7 (-30%).
    ("2026_04_28_115_wb_shield", [
        "ALTER TABLE world_boss_player_state ADD COLUMN shield_until_ms INTEGER DEFAULT 0",
    ]),

    # 17. QTE-кулдаун в БД (раньше был в памяти — сбрасывался при рестарте).
    #     last_qte_ms — unix-timestamp в мс последнего успешного QTE.
    ("2026_04_28_116_wb_qte_cooldown_ms", [
        "ALTER TABLE world_boss_player_state ADD COLUMN last_qte_ms INTEGER DEFAULT 0",
    ]),

    # 18. Индексы для часто сортируемых колонок без покрытия:
    #     - clans.season_score / wins — для кланового лидерборда (ORDER BY season_score DESC)
    #     - LOWER(players.username) — для поиска без учёта регистра (LIKE, CASE)
    ("2026_05_01_117_perf_indexes", [
        "CREATE INDEX IF NOT EXISTS idx_clans_season_score ON clans (season_score DESC)",
        "CREATE INDEX IF NOT EXISTS idx_clans_wins ON clans (wins DESC)",
        "CREATE INDEX IF NOT EXISTS idx_players_username_lower ON players (LOWER(username))",
    ]),

    # 19. Недельный рейтинг урона по боссу.
    ("2026_05_10_118_wb_weekly_scores", [
        """CREATE TABLE IF NOT EXISTS wb_weekly_scores (
            user_id INTEGER NOT NULL,
            week_key TEXT NOT NULL,
            total_damage INTEGER DEFAULT 0,
            raids_count INTEGER DEFAULT 0,
            PRIMARY KEY (user_id, week_key)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_wb_weekly_week ON wb_weekly_scores (week_key, total_damage DESC)",
    ]),

    # 20. Set-bonus perks state: флаг использования one-shot перка second_wind.
    #     Остальные перки (decisive_strike, cold_blood, gods_wrath) считаются
    #     из hits_count, отдельной колонки не требуют.
    ("2026_05_14_119_wb_set_perks", [
        "ALTER TABLE world_boss_player_state ADD COLUMN sb_second_wind_used INTEGER DEFAULT 0",
    ]),

    # 21. Расширение слотов рейд-свитков до 5 (все 5 типов могут быть активны
    #     одновременно — по 1 каждого). raid_scroll_1/2 остаются для совместимости,
    #     добавляем JSON-список raid_scrolls_active как источник правды для
    #     damage_calc. На первом ударе сервер забирает ВСЕ купленные WB-свитки из
    #     инвентаря, кладёт сюда списком, в инвентаре их больше нет.
    ("2026_05_29_120_wb_raid_scrolls_active", [
        "ALTER TABLE world_boss_player_state ADD COLUMN raid_scrolls_active TEXT DEFAULT '[]'",
    ]),

    # 22. Чат в зале ожидания рейда. Живёт только во время фазы сбора
    #     (5 мин до старта). На start_wb_spawn чистится. Видят только
    #     зарегистрированные на рейд. Лимит 200 символов, мат-фильтр,
    #     кулдаун 2с между сообщениями — на стороне API.
    ("2026_06_03_121_wb_lobby_chat", [
        """CREATE TABLE IF NOT EXISTS world_boss_lobby_chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            message TEXT NOT NULL,
            ts INTEGER NOT NULL
        )""",
        "CREATE INDEX IF NOT EXISTS idx_wb_lobby_chat_ts ON world_boss_lobby_chat (ts)",
        "CREATE INDEX IF NOT EXISTS idx_wb_lobby_chat_user_ts ON world_boss_lobby_chat (user_id, ts DESC)",
    ]),
]
