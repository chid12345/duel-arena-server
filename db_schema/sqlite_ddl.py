"""CREATE TABLE и индексы SQLite при первом старте."""
from __future__ import annotations


def create_sqlite_tables(cursor) -> None:
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS players (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            level INTEGER DEFAULT 0,
            exp INTEGER DEFAULT 0,
            strength INTEGER DEFAULT 10,
            endurance INTEGER DEFAULT 10,
            max_hp INTEGER DEFAULT 100,
            current_hp INTEGER DEFAULT 100,
            gold INTEGER DEFAULT 0,
            diamonds INTEGER DEFAULT 0,
            free_stats INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            losses INTEGER DEFAULT 0,
            rating INTEGER DEFAULT 1000,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            daily_streak INTEGER DEFAULT 0,
            last_daily DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS improvements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            improvement_type TEXT,
            level INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES players (user_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            item_name TEXT,
            item_type TEXT,
            item_value INTEGER,
            quantity INTEGER DEFAULT 1,
            is_premium BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES players (user_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bots (
            bot_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            level INTEGER,
            strength INTEGER,
            endurance INTEGER,
            max_hp INTEGER,
            current_hp INTEGER,
            bot_type TEXT,
            ai_pattern TEXT,
            last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            battles_count INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            win_streak INTEGER DEFAULT 0
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS battles (
            battle_id INTEGER PRIMARY KEY AUTOINCREMENT,
            player1_id INTEGER,
            player2_id INTEGER,
            is_bot1 BOOLEAN DEFAULT 0,
            is_bot2 BOOLEAN DEFAULT 0,
            winner_id INTEGER,
            battle_result TEXT,
            rounds_played INTEGER,
            battle_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player1_id) REFERENCES players (user_id),
            FOREIGN KEY (player2_id) REFERENCES players (user_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            achievement_name TEXT,
            achievement_data TEXT,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES players (user_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_bonuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            bonus_date DATE,
            bonus_type TEXT,
            bonus_value INTEGER,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES players (user_id)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS metric_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            user_id INTEGER,
            value INTEGER DEFAULT 0,
            duration_ms INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_quests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            quest_date DATE NOT NULL,
            battles_played INTEGER DEFAULT 0,
            battles_won INTEGER DEFAULT 0,
            reward_claimed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, quest_date)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pvp_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challenger_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            expires_at INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pvp_ch_target_status ON pvp_challenges (target_id, status, created_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pvp_ch_challenger_status ON pvp_challenges (challenger_id, status, created_at)")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS titan_progress (
            user_id INTEGER PRIMARY KEY,
            best_floor INTEGER DEFAULT 0,
            current_floor INTEGER DEFAULT 1,
            weekly_best_floor INTEGER DEFAULT 0,
            weekly_best_at INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_titan_weekly_best ON titan_progress (weekly_best_floor DESC, weekly_best_at ASC)")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS weekly_claims (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            week_key TEXT NOT NULL,
            claim_key TEXT NOT NULL,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, week_key, claim_key)
        )
    ''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_weekly_claims_user_week ON weekly_claims (user_id, week_key)")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_migrations (
            migration_id TEXT PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            class_id TEXT NOT NULL,
            class_type TEXT NOT NULL,
            purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            equipped BOOLEAN DEFAULT FALSE,
            custom_name TEXT,
            strength_saved INTEGER DEFAULT 0,
            agility_saved INTEGER DEFAULT 0,
            intuition_saved INTEGER DEFAULT 0,
            endurance_saved INTEGER DEFAULT 0,
            free_stats_saved INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE,
            UNIQUE(user_id, class_id)
        )
    ''')
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory (user_id, class_type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON user_inventory (user_id, equipped) WHERE equipped = TRUE")
