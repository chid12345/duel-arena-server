"""DDL: индексы (как в миграциях SQLite)."""

from __future__ import annotations

POSTGRES_DDL_03: tuple[str, ...] = (
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
    # Производительность: поиск по нику, сезонные данные, дневные квесты
    "CREATE INDEX IF NOT EXISTS idx_players_username ON players (username)",
    "CREATE INDEX IF NOT EXISTS idx_season_stats_user ON season_stats (user_id)",
    "CREATE INDEX IF NOT EXISTS idx_daily_quests_user ON daily_quests (user_id)",
    # Еженедельный PvP-лидерборд: is_bot2=FALSE + created_at range.
    "CREATE INDEX IF NOT EXISTS idx_battles_pvp_weekly ON battles (is_bot2, created_at)",
)
