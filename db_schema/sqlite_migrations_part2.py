"""SQLite migrations chunk 2."""
from __future__ import annotations

MIGRATIONS_PART2 = [
    ("2026_04_11_001_hp_regen", [
        "ALTER TABLE players ADD COLUMN last_hp_regen TEXT DEFAULT NULL",
    ]),
    ("2026_04_11_002_sync_last_hp_regen_all", [
        "UPDATE players SET last_hp_regen = strftime('%Y-%m-%dT%H:%M:%S', 'now')",
    ]),
    ("2026_04_13_000a_premium_subscription", [
        "ALTER TABLE players ADD COLUMN premium_until TEXT DEFAULT NULL",
    ]),
    ("2026_04_13_000_stars_payments", [
        """CREATE TABLE IF NOT EXISTS stars_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            package_id TEXT NOT NULL,
            diamonds INTEGER NOT NULL DEFAULT 0,
            stars INTEGER NOT NULL DEFAULT 0,
            source TEXT NOT NULL DEFAULT 'tma',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_stars_payments_user ON stars_payments (user_id, created_at)",
    ]),
    ("2026_04_13_001_crypto_invoices", [
        """CREATE TABLE IF NOT EXISTS crypto_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            diamonds INTEGER NOT NULL DEFAULT 0,
            asset TEXT NOT NULL DEFAULT 'TON',
            amount TEXT NOT NULL DEFAULT '0',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_crypto_invoices_user ON crypto_invoices (user_id)",
        "CREATE INDEX IF NOT EXISTS idx_crypto_invoices_status ON crypto_invoices (status, created_at)",
    ]),
    ("2026_04_13_002_crypto_invoices_payload", [
        "ALTER TABLE crypto_invoices ADD COLUMN payload TEXT NOT NULL DEFAULT ''",
    ]),
    ("2026_04_12_001_referral_payouts", [
        "ALTER TABLE players ADD COLUMN referral_subscriber_rank INTEGER",
        "ALTER TABLE players ADD COLUMN referral_tier TEXT",
        "ALTER TABLE players ADD COLUMN first_premium_at TEXT",
        """CREATE TABLE IF NOT EXISTS referral_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer_id INTEGER NOT NULL,
            buyer_id INTEGER NOT NULL,
            reward_type TEXT NOT NULL,
            percent INTEGER,
            base_stars INTEGER DEFAULT 0,
            base_gold INTEGER DEFAULT 0,
            base_diamonds INTEGER DEFAULT 0,
            reward_diamonds INTEGER DEFAULT 0,
            reward_gold INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards (referrer_id)",
    ]),
    ("2026_04_15_001_clan_chat", [
        """CREATE TABLE IF NOT EXISTS clan_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clan_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL DEFAULT '',
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_clan_messages_clan ON clan_messages (clan_id, created_at)",
    ]),
    ("2026_04_05_002_referral_usdt", [
        "ALTER TABLE players ADD COLUMN referral_usdt_balance REAL DEFAULT 0",
        "ALTER TABLE referral_rewards ADD COLUMN reward_usdt REAL DEFAULT 0",
        """CREATE TABLE IF NOT EXISTS referral_withdrawals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            telegram_username TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_ref_withdrawals_user ON referral_withdrawals (user_id)",
    ]),
    ("2026_04_05_003_withdrawal_cooldown", [
        "ALTER TABLE players ADD COLUMN last_withdrawal_at TIMESTAMP",
    ]),
    ("2026_04_16_001_pvp_challenges", [
        """CREATE TABLE IF NOT EXISTS pvp_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challenger_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            expires_at INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""",
        "CREATE INDEX IF NOT EXISTS idx_pvp_ch_target_status ON pvp_challenges (target_id, status, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_pvp_ch_challenger_status ON pvp_challenges (challenger_id, status, created_at)",
    ]),
]
