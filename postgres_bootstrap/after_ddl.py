"""Доп. DDL после основных таблиц (колонки, weekly, endless)."""

from __future__ import annotations

POSTGRES_AFTER_DDL: tuple[str, ...] = (
    "ALTER TABLE players ADD COLUMN IF NOT EXISTS display_title TEXT",
    """CREATE TABLE IF NOT EXISTS weekly_leaderboard_payouts (
        week_key TEXT NOT NULL,
        board TEXT NOT NULL,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (week_key, board)
    )""",
    """CREATE TABLE IF NOT EXISTS titan_weekly_scores (
        user_id BIGINT NOT NULL,
        week_key TEXT NOT NULL,
        max_floor INTEGER NOT NULL DEFAULT 0,
        best_at BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, week_key)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_tws_week_rank ON titan_weekly_scores (week_key, max_floor DESC, best_at ASC)",
    "ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_reset_ts BIGINT DEFAULT 0",
    "INSERT INTO seasons (id, name, status) VALUES (1, 'Сезон 1: Начало', 'active') ON CONFLICT (id) DO NOTHING",
    "SELECT setval(pg_get_serial_sequence('seasons', 'id'), COALESCE((SELECT MAX(id) FROM seasons), 1), true)",
    """CREATE TABLE IF NOT EXISTS endless_progress (
        user_id BIGINT PRIMARY KEY,
        best_wave INTEGER DEFAULT 0,
        current_wave INTEGER DEFAULT 0,
        current_hp INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
    "CREATE INDEX IF NOT EXISTS idx_endless_progress_best ON endless_progress (best_wave DESC, updated_at ASC)",
    """CREATE TABLE IF NOT EXISTS endless_attempts (
        user_id BIGINT NOT NULL,
        attempt_date TEXT NOT NULL,
        attempts_used INTEGER DEFAULT 0,
        extra_gold INTEGER DEFAULT 0,
        extra_diamond INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, attempt_date)
    )""",
    "ALTER TABLE battle_pass ADD COLUMN IF NOT EXISTS endless_done INTEGER DEFAULT 0",
    "ALTER TABLE battle_pass ADD COLUMN IF NOT EXISTS endless_tier_claimed INTEGER DEFAULT 0",
    "ALTER TABLE daily_quests ADD COLUMN IF NOT EXISTS endless_wins INTEGER DEFAULT 0",
    """CREATE TABLE IF NOT EXISTS endless_weekly_scores (
        user_id BIGINT NOT NULL,
        week_key TEXT NOT NULL,
        weekly_wins INTEGER NOT NULL DEFAULT 0,
        best_wave_this_week INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, week_key)
    )""",
    # ── Магазин: инвентарь + бафы ──────────────────────────────
    """CREATE TABLE IF NOT EXISTS player_inventory (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES players(user_id) ON DELETE CASCADE,
        item_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1
    )""",
    "CREATE INDEX IF NOT EXISTS idx_inv_uid ON player_inventory(user_id)",
    """CREATE TABLE IF NOT EXISTS player_buffs (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES players(user_id) ON DELETE CASCADE,
        buff_type TEXT NOT NULL,
        value INTEGER NOT NULL,
        charges INTEGER,
        expires_at TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS idx_pbuffs_uid ON player_buffs(user_id)",
    "ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_box_claimed DATE",
    # Башня Титанов: флаг активной сессии (1 = в заходе, 0 = завершён)
    "ALTER TABLE titan_progress ADD COLUMN IF NOT EXISTS run_active INTEGER DEFAULT 0",
    # crypto_invoices: payload добавлен позже (для USDT-свитков)
    "ALTER TABLE crypto_invoices ADD COLUMN IF NOT EXISTS payload TEXT NOT NULL DEFAULT ''",
    # ── Система заданий v2 ─────────────────────────────────────
    "ALTER TABLE daily_quests ADD COLUMN IF NOT EXISTS bot_wins INTEGER DEFAULT 0",
    "ALTER TABLE daily_quests ADD COLUMN IF NOT EXISTS shop_buys INTEGER DEFAULT 0",
    """CREATE TABLE IF NOT EXISTS task_progress (
        user_id BIGINT NOT NULL,
        task_key TEXT NOT NULL,
        value INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, task_key)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_task_progress_user ON task_progress (user_id)",
    """CREATE TABLE IF NOT EXISTS task_claims (
        user_id BIGINT NOT NULL,
        claim_key TEXT NOT NULL,
        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, claim_key)
    )""",
    "CREATE INDEX IF NOT EXISTS idx_task_claims_user ON task_claims (user_id)",
    """CREATE TABLE IF NOT EXISTS login_streak_v2 (
        user_id BIGINT PRIMARY KEY,
        streak_day INTEGER DEFAULT 0,
        week_set INTEGER DEFAULT 0,
        last_login_date TEXT DEFAULT '',
        days_claimed_json TEXT DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
)
