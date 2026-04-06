"""
База данных Duel Arena
Локально: SQLite. Продакшен: PostgreSQL при DATABASE_URL (Supabase / Render).
"""

import logging
import re
import sqlite3
import random
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple


def iso_week_key_utc(ts: Optional[float] = None) -> str:
    """Ключ ISO-недели по UTC, как в API (2026-W15)."""
    t = time.time() if ts is None else float(ts)
    dt = datetime.fromtimestamp(t, tz=timezone.utc)
    y, w, _ = dt.isocalendar()
    return f"{int(y)}-W{int(w):02d}"


def prev_iso_week_bounds_utc() -> Tuple[str, datetime, datetime]:
    """Прошлая ISO-неделя: (week_key, start включительно, end исключительно), UTC naive для SQL."""
    now = datetime.now(timezone.utc)
    d = now.date()
    monday = datetime(d.year, d.month, d.day, tzinfo=timezone.utc) - timedelta(days=d.weekday())
    week_start_cur = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start_prev = week_start_cur - timedelta(days=7)
    week_end_prev = week_start_cur
    y, w, _ = week_start_prev.date().isocalendar()
    key = f"{int(y)}-W{int(w):02d}"
    # naive UTC для сравнения с created_at в SQLite (текст) и PG timestamp
    start_naive = week_start_prev.replace(tzinfo=None)
    end_naive = week_end_prev.replace(tzinfo=None)
    return key, start_naive, end_naive


def weekly_pvp_rank_reward(rank: int) -> Tuple[int, str]:
    if rank == 1:
        return 120, "Легенда PvP"
    if rank == 2:
        return 80, "Мастер PvP"
    if rank == 3:
        return 50, "Герой арены"
    if 4 <= rank <= 10:
        return 20, "Участник топа"
    return 0, ""


def weekly_titan_rank_reward(rank: int) -> Tuple[int, str]:
    if rank == 1:
        return 150, "Покоритель Титанов"
    if rank == 2:
        return 90, "Гроза Башни"
    if rank == 3:
        return 60, "Титаноборец"
    if 4 <= rank <= 10:
        return 25, "Штурмовик Башни"
    return 0, ""

from config import *
from postgres_bootstrap import bootstrap_postgres_schema

_log = logging.getLogger(__name__)


def _norm_sql(sql: str) -> str:
    return " ".join(sql.split())


# Точные замены SQLite → PostgreSQL (после нормализации пробелов).
_PG_EXACT: List[Tuple[str, str]] = [
    (
        "INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (?, ?, 0, 0, 0)",
        "INSERT INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed) VALUES (%s, %s, 0, 0, FALSE) ON CONFLICT (user_id, quest_date) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO improvements (user_id, improvement_type, level) VALUES (?, ?, 0)",
        "INSERT INTO improvements (user_id, improvement_type, level) VALUES (%s, %s, 0) ON CONFLICT (user_id, improvement_type) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO bots (name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "INSERT INTO bots (name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (name) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO referrals (referral_code, referrer_id, referred_id) VALUES (?, ?, ?)",
        "INSERT INTO referrals (referral_code, referrer_id, referred_id) VALUES (%s, %s, %s) ON CONFLICT (referred_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO season_stats (season_id, user_id) VALUES (?, ?)",
        "INSERT INTO season_stats (season_id, user_id) VALUES (%s, %s) ON CONFLICT (season_id, user_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)",
        "INSERT INTO battle_pass (user_id, season_id) VALUES (%s, %s) ON CONFLICT (user_id, season_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        "INSERT INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status) VALUES (%s, %s, %s, %s, %s, 'pending') ON CONFLICT (invoice_id) DO NOTHING",
    ),
    (
        "INSERT OR REPLACE INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (?, ?, ?, ?)",
        "INSERT INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (%s, %s, %s, %s) "
        "ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, chat_id = EXCLUDED.chat_id, message_id = EXCLUDED.message_id",
    ),
]


def _adapt_sql_pg(sql: str) -> str:
    n = _norm_sql(sql)
    for lite, pg in _PG_EXACT:
        if n == _norm_sql(lite):
            return pg
    s = sql
    s = re.sub(
        r"datetime\s*\(\s*'now'\s*,\s*\?\s*\|\|\s*' seconds'\s*\)",
        "__PG_INTERVAL_SEC__",
        s,
    )
    s = s.replace("datetime('now', '-1 day')", "(NOW() - INTERVAL '1 day')")
    s = s.replace("datetime('now', '-1 hour')", "(NOW() - INTERVAL '1 hour')")
    s = s.replace("datetime('now', '-5 minutes')", "(NOW() - INTERVAL '5 minutes')")
    s = s.replace("datetime('now', '-20 hours')", "(NOW() - INTERVAL '20 hours')")
    s = s.replace("strftime('%H:%M', created_at)", "to_char(created_at, 'HH24:MI')")
    s = s.replace("rating = MAX(900, rating - 5)", "rating = GREATEST(900, rating - 5)")
    s = s.replace(
        "referral_usdt_balance = MAX(0, COALESCE(referral_usdt_balance,0) - ?)",
        "referral_usdt_balance = GREATEST(0, COALESCE(referral_usdt_balance,0) - ?)",
    )
    # Булевые поля: 0/1 → FALSE/TRUE для PostgreSQL BOOLEAN-колонок
    s = re.sub(r'\breward_claimed\s*=\s*1\b', 'reward_claimed = TRUE',  s)
    s = re.sub(r'\breward_claimed\s*=\s*0\b', 'reward_claimed = FALSE', s)
    s = re.sub(r'\bis_bot2\s*=\s*1\b',        'is_bot2 = TRUE',         s)
    s = re.sub(r'\bis_bot2\s*=\s*0\b',        'is_bot2 = FALSE',        s)
    s = re.sub(r'\bis_bot1\s*=\s*1\b',        'is_bot1 = TRUE',         s)
    s = re.sub(r'\bis_bot1\s*=\s*0\b',        'is_bot1 = FALSE',        s)
    s = re.sub(r'\bis_premium\s*=\s*1\b',     'is_premium = TRUE',      s)
    s = re.sub(r'\bis_premium\s*=\s*0\b',     'is_premium = FALSE',     s)
    s = re.sub(r'\bclaimed\s*=\s*1\b',        'claimed = TRUE',         s)
    s = re.sub(r'\bclaimed\s*=\s*0\b',        'claimed = FALSE',        s)
    s = s.replace("?", "%s")
    s = s.replace("__PG_INTERVAL_SEC__", "(NOW() + (%s::text || ' seconds')::interval)")
    return s


class _PatchedCursor:
    """Для PostgreSQL: плейсхолдеры и отличия диалекта от SQLite."""

    def __init__(self, raw: Any, use_pg: bool):
        self._raw = raw
        self._use_pg = use_pg

    def execute(self, sql: str, params: Optional[Any] = None):
        if self._use_pg:
            sql = _adapt_sql_pg(sql)
        if params is None:
            return self._raw.execute(sql)
        return self._raw.execute(sql, params)

    def __getattr__(self, name: str):
        return getattr(self._raw, name)


class _PatchedConn:
    def __init__(self, raw: Any, use_pg: bool):
        self._raw = raw
        self._use_pg = use_pg

    def cursor(self):
        return _PatchedCursor(self._raw.cursor(), self._use_pg)

    def commit(self):
        return self._raw.commit()

    def rollback(self):
        return self._raw.rollback()

    def close(self):
        return self._raw.close()

    def __getattr__(self, name: str):
        return getattr(self._raw, name)


class Database:
    """Класс для работы с базой данных"""

    # Сериализация bootstrap схемы PostgreSQL (устраняет гонки CREATE TABLE/TYPE при параллельном старте процессов).
    _ADV_PG_SCHEMA_K1 = 428470
    _ADV_PG_SCHEMA_K2 = 921002
    # Uvicorn и main.py стартуют параллельно — только один процесс делает засев/ребаланс ботов (иначе блокировки + timeout).
    _ADV_PG_INIT_K1 = 428471
    _ADV_PG_INIT_K2 = 921003

    def __init__(self):
        self._pg = bool(DATABASE_URL)
        self.db_name = DB_NAME
        self.init_database()
    
    def get_connection(self):
        """Получить соединение с базой данных"""
        if self._pg:
            import psycopg
            from psycopg.rows import dict_row

            # Transaction pooler (Supabase/PgBouncer): без prepared statements — иначе DuplicatePreparedStatement.
            raw = psycopg.connect(
                DATABASE_URL, row_factory=dict_row, prepare_threshold=None
            )
            return _PatchedConn(raw, True)
        conn = sqlite3.connect(self.db_name, timeout=15)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Инициализация всех таблиц"""
        if self._pg:
            conn = self.get_connection()
            cursor = conn.cursor()
            schema_lock_held = False
            lock_held = False
            try:
                # 1) Блокируем bootstrap схемы (все процессы по очереди, без конкурентных CREATE).
                cursor.execute(
                    "SELECT pg_advisory_lock(%s, %s)",
                    (Database._ADV_PG_SCHEMA_K1, Database._ADV_PG_SCHEMA_K2),
                )
                schema_lock_held = True
                try:
                    bootstrap_postgres_schema(cursor)
                    conn.commit()
                finally:
                    ucur = conn.cursor()
                    ucur.execute(
                        "SELECT pg_advisory_unlock(%s, %s)",
                        (Database._ADV_PG_SCHEMA_K1, Database._ADV_PG_SCHEMA_K2),
                    )
                    conn.commit()
                    schema_lock_held = False

                # 2) Тяжёлый засев/ребаланс выполняет только один процесс.
                cursor.execute(
                    "SELECT pg_try_advisory_lock(%s, %s)",
                    (Database._ADV_PG_INIT_K1, Database._ADV_PG_INIT_K2),
                )
                row = cursor.fetchone()
                lock_held = bool(row and next(iter(row.values())))
                if lock_held:
                    self.create_initial_bots(conn)
                    self.rebalance_all_bots(conn)
            finally:
                if schema_lock_held:
                    try:
                        ucur = conn.cursor()
                        ucur.execute(
                            "SELECT pg_advisory_unlock(%s, %s)",
                            (Database._ADV_PG_SCHEMA_K1, Database._ADV_PG_SCHEMA_K2),
                        )
                        conn.commit()
                    except Exception:
                        pass
                if lock_held:
                    try:
                        ucur = conn.cursor()
                        ucur.execute(
                            "SELECT pg_advisory_unlock(%s, %s)",
                            (Database._ADV_PG_INIT_K1, Database._ADV_PG_INIT_K2),
                        )
                        conn.commit()
                    except Exception:
                        pass
                conn.close()
            return

        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Таблица игроков
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
        
        # Таблица улучшений игроков
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS improvements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                improvement_type TEXT,
                level INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')
        
        # Таблица инвентаря
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
        
        # Таблица ботов
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
                wins INTEGER DEFAULT 0
            )
        ''')
        
        # Таблица боев
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
        
        # Таблица достижений
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
        
        # Таблица ежедневных бонусов
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

        # Таблица метрик и событий
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

        # Ежедневные квесты
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
        # Вызовы PvP по нику (pending/accepted/declined/expired)
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
        # Башня титанов: прогресс и недельные клеймы
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

        # Таблица миграций (эквивалент lightweight migration system)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schema_migrations (
                migration_id TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        self._apply_migrations(cursor)
        
        conn.commit()
        conn.close()
        
        self.create_initial_bots()
        self.rebalance_all_bots()

    def _apply_migrations(self, cursor):
        """Применить встроенные миграции для SQLite."""
        migrations = [
            (
                "2026_04_02_001_add_hot_indexes",
                [
                    "CREATE INDEX IF NOT EXISTS idx_players_rating ON players (rating DESC)",
                    "CREATE INDEX IF NOT EXISTS idx_players_last_active ON players (last_active)",
                    "CREATE INDEX IF NOT EXISTS idx_bots_level ON bots (level)",
                    "CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles (created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_battles_player1_id ON battles (player1_id)",
                    "CREATE INDEX IF NOT EXISTS idx_battles_player2_id ON battles (player2_id)",
                    "CREATE INDEX IF NOT EXISTS idx_metric_events_type_time ON metric_events (event_type, created_at)",
                    "CREATE INDEX IF NOT EXISTS idx_metric_events_user_time ON metric_events (user_id, created_at)",
                    "CREATE UNIQUE INDEX IF NOT EXISTS idx_improvements_user_type ON improvements (user_id, improvement_type)",
                ],
            ),
            (
                "2026_04_03_001_player_win_streak",
                [
                    "ALTER TABLE players ADD COLUMN win_streak INTEGER DEFAULT 0",
                ],
            ),
            (
                "2026_04_03_002_progression_crit_milestones",
                [
                    "ALTER TABLE players ADD COLUMN crit INTEGER DEFAULT 3",
                    "ALTER TABLE players ADD COLUMN exp_milestones INTEGER DEFAULT 0",
                ],
            ),
            (
                "2026_04_03_003_level_zero_based",
                [
                    # Было: старт с уровня 1; стало: 0 в UI. Сдвигаем всех на −1.
                    "UPDATE players SET level = CASE WHEN level > 0 THEN level - 1 ELSE 0 END",
                    "UPDATE players SET exp_milestones = 0 WHERE exp_milestones IS NULL",
                ],
            ),
            (
                "2026_04_03_004_battle_energy",
                [
                    # Колонки энергии были добавлены, но фича убрана — оставляем заглушку
                    # чтобы migration_id не применялся повторно на старых БД
                    "SELECT 1",
                ],
            ),
            (
                "2026_04_04_001_bots_crit",
                [
                    "ALTER TABLE bots ADD COLUMN crit INTEGER DEFAULT 3",
                ],
            ),
            (
                "2026_04_05_001_generous_energy",
                [
                    "SELECT 1",
                ],
            ),
            (
                "2026_04_06_001_global_progress_reset",
                [
                    "UPDATE players SET level = 0, exp = 0, exp_milestones = 0, "
                    "strength = 3, endurance = 3, crit = 3, max_hp = 36, current_hp = 36, "
                    "free_stats = 5, wins = 0, losses = 0, win_streak = 0, rating = 1000, "
                    "gold = 0, daily_streak = 0, last_daily = NULL",
                    "UPDATE improvements SET level = 0",
                    "DELETE FROM daily_quests",
                ],
            ),
            (
                "2026_04_07_001_seed_bots_level_zero",
                [
                    """UPDATE bots SET level = 0 WHERE rowid IN (
                        SELECT rowid FROM bots WHERE level BETWEEN 1 AND 5 ORDER BY RANDOM() LIMIT 180
                    )""",
                ],
            ),
            (
                "2026_04_08_001_null_crit_defaults",
                [
                    "UPDATE bots SET crit = 3 WHERE crit IS NULL",
                    "UPDATE players SET crit = 3 WHERE crit IS NULL",
                ],
            ),
            (
                "2026_04_09_001_drop_energy_columns",
                [
                    # SQLite 3.35+ поддерживает DROP COLUMN.
                    # IF EXISTS не поддерживается — обрабатываем ошибки в _apply_migrations.
                    "ALTER TABLE players DROP COLUMN battle_energy",
                    "ALTER TABLE players DROP COLUMN energy_cap",
                    "ALTER TABLE players DROP COLUMN energy_last_at",
                ],
            ),
            (
                "2026_04_09_002_referral_system",
                [
                    "ALTER TABLE players ADD COLUMN referral_code TEXT",
                    "ALTER TABLE players ADD COLUMN referred_by TEXT",
                    """CREATE TABLE IF NOT EXISTS referrals (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        referral_code TEXT NOT NULL,
                        referrer_id INTEGER NOT NULL,
                        referred_id INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(referred_id)
                    )""",
                    "CREATE UNIQUE INDEX IF NOT EXISTS idx_players_referral_code ON players (referral_code) WHERE referral_code IS NOT NULL",
                    "CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id)",
                ],
            ),
            (
                "2026_04_09_003_chat_id_and_pvp",
                [
                    # chat_id нужен для push-уведомлений и PvP
                    "ALTER TABLE players ADD COLUMN chat_id INTEGER",
                    # PvP очередь
                    """CREATE TABLE IF NOT EXISTS pvp_queue (
                        user_id INTEGER PRIMARY KEY,
                        level INTEGER NOT NULL,
                        chat_id INTEGER NOT NULL,
                        message_id INTEGER,
                        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )""",
                    "CREATE INDEX IF NOT EXISTS idx_pvp_queue_level ON pvp_queue (level)",
                ],
            ),
            (
                "2026_04_09_004_seasons",
                [
                    """CREATE TABLE IF NOT EXISTS seasons (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        status TEXT DEFAULT 'active',
                        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        ended_at TIMESTAMP
                    )""",
                    """CREATE TABLE IF NOT EXISTS season_stats (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        season_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        wins INTEGER DEFAULT 0,
                        losses INTEGER DEFAULT 0,
                        rating INTEGER DEFAULT 1000,
                        UNIQUE(season_id, user_id),
                        FOREIGN KEY (season_id) REFERENCES seasons(id)
                    )""",
                    """CREATE TABLE IF NOT EXISTS season_rewards (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        season_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        rank INTEGER,
                        diamonds INTEGER DEFAULT 0,
                        reward_title TEXT,
                        claimed BOOLEAN DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )""",
                    # Первый сезон
                    "INSERT OR IGNORE INTO seasons (id, name, status) VALUES (1, 'Сезон 1: Начало', 'active')",
                ],
            ),
            (
                "2026_04_09_005_shop_buffs",
                [
                    # xp_boost_charges: сколько боёв осталось с +50% XP
                    "ALTER TABLE players ADD COLUMN xp_boost_charges INTEGER DEFAULT 0",
                ],
            ),
            (
                "2026_04_09_006_battle_pass",
                [
                    """CREATE TABLE IF NOT EXISTS battle_pass (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        season_id INTEGER NOT NULL DEFAULT 1,
                        battles_done INTEGER DEFAULT 0,
                        wins_done INTEGER DEFAULT 0,
                        streak_done INTEGER DEFAULT 0,
                        last_claimed_tier INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, season_id)
                    )""",
                ],
            ),
            (
                "2026_04_09_007_clans",
                [
                    """CREATE TABLE IF NOT EXISTS clans (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        tag TEXT UNIQUE NOT NULL,
                        leader_id INTEGER NOT NULL,
                        description TEXT DEFAULT '',
                        level INTEGER DEFAULT 1,
                        wins INTEGER DEFAULT 0,
                        gold_bank INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )""",
                    """CREATE TABLE IF NOT EXISTS clan_members (
                        user_id INTEGER PRIMARY KEY,
                        clan_id INTEGER NOT NULL,
                        role TEXT DEFAULT 'member',
                        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (clan_id) REFERENCES clans(id)
                    )""",
                    "ALTER TABLE players ADD COLUMN clan_id INTEGER",
                    "CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members (clan_id)",
                ],
            ),
            (
                "2026_04_10_001_level_one_based",
                [
                    # Убрали ур.0: только записи с level=0 → 1 (без сдвига остальных — совпадает с xp_to_next в JSON)
                    "UPDATE players SET level = 1 WHERE level = 0",
                    "UPDATE bots SET level = 1 WHERE level = 0",
                    "UPDATE pvp_queue SET level = 1 WHERE level = 0",
                    "UPDATE players SET exp_milestones = 0",
                ],
            ),
            (
                "2026_04_10_002_fix_level1_free_stats",
                [
                    # Исправить свежие профили после перехода на ур.1, где случайно стало +10 свободных статов.
                    f"""UPDATE players
                        SET free_stats = {PLAYER_START_FREE_STATS}
                        WHERE level = 1
                          AND exp = 0
                          AND wins = 0
                          AND losses = 0
                          AND strength = {PLAYER_START_STRENGTH}
                          AND endurance = {PLAYER_START_ENDURANCE}
                          AND crit = {PLAYER_START_CRIT}
                          AND free_stats = {PLAYER_START_FREE_STATS + stats_when_reaching_level(1)}""",
                ],
            ),
            (
                "2026_04_11_001_hp_regen",
                [
                    "ALTER TABLE players ADD COLUMN last_hp_regen TEXT DEFAULT NULL",
                ],
            ),
            (
                "2026_04_11_002_sync_last_hp_regen_all",
                [
                    # Разово выровнять таймер реген HP: старые last_hp_regen давали «мгновенный полный» при /start.
                    # Формат с «T» — как у Python isoformat (см. apply_hp_regen).
                    "UPDATE players SET last_hp_regen = strftime('%Y-%m-%dT%H:%M:%S', 'now')",
                ],
            ),
            (
                "2026_04_13_000a_premium_subscription",
                [
                    # Дата окончания Premium подписки (ISO строка, NULL = нет подписки)
                    "ALTER TABLE players ADD COLUMN premium_until TEXT DEFAULT NULL",
                ],
            ),
            (
                "2026_04_13_000_stars_payments",
                [
                    # Лог Stars-оплат для идемпотентного начисления алмазов
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
                ],
            ),
            (
                "2026_04_13_001_crypto_invoices",
                [
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
                ],
            ),
            (
                "2026_04_12_001_referral_payouts",
                [
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
                ],
            ),
            (
                "2026_04_15_001_clan_chat",
                [
                    """CREATE TABLE IF NOT EXISTS clan_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        clan_id INTEGER NOT NULL,
                        user_id INTEGER NOT NULL,
                        username TEXT NOT NULL DEFAULT '',
                        message TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )""",
                    "CREATE INDEX IF NOT EXISTS idx_clan_messages_clan ON clan_messages (clan_id, created_at)",
                ],
            ),
            (
                "2026_04_05_002_referral_usdt",
                [
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
                ],
            ),
            (
                "2026_04_05_003_withdrawal_cooldown",
                [
                    "ALTER TABLE players ADD COLUMN last_withdrawal_at TIMESTAMP",
                ],
            ),
            (
                "2026_04_16_001_pvp_challenges",
                [
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
                ],
            ),
            (
                "2026_04_16_002_titan_and_weekly_claims",
                [
                    """CREATE TABLE IF NOT EXISTS titan_progress (
                        user_id INTEGER PRIMARY KEY,
                        best_floor INTEGER DEFAULT 0,
                        current_floor INTEGER DEFAULT 1,
                        weekly_best_floor INTEGER DEFAULT 0,
                        weekly_best_at INTEGER DEFAULT 0,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )""",
                    "CREATE INDEX IF NOT EXISTS idx_titan_weekly_best ON titan_progress (weekly_best_floor DESC, weekly_best_at ASC)",
                    """CREATE TABLE IF NOT EXISTS weekly_claims (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        week_key TEXT NOT NULL,
                        claim_key TEXT NOT NULL,
                        claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id, week_key, claim_key)
                    )""",
                    "CREATE INDEX IF NOT EXISTS idx_weekly_claims_user_week ON weekly_claims (user_id, week_key)",
                ],
            ),
            (
                "2026_04_16_003_profile_reset_ts",
                [
                    "ALTER TABLE players ADD COLUMN profile_reset_ts INTEGER DEFAULT 0",
                ],
            ),
            (
                "2026_04_17_001_weekly_leaderboard_rewards",
                [
                    "ALTER TABLE players ADD COLUMN display_title TEXT",
                    """CREATE TABLE IF NOT EXISTS weekly_leaderboard_payouts (
                        week_key TEXT NOT NULL,
                        board TEXT NOT NULL,
                        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (week_key, board)
                    )""",
                    """CREATE TABLE IF NOT EXISTS titan_weekly_scores (
                        user_id INTEGER NOT NULL,
                        week_key TEXT NOT NULL,
                        max_floor INTEGER NOT NULL DEFAULT 0,
                        best_at INTEGER NOT NULL DEFAULT 0,
                        PRIMARY KEY (user_id, week_key)
                    )""",
                    "CREATE INDEX IF NOT EXISTS idx_tws_week_rank ON titan_weekly_scores (week_key, max_floor DESC, best_at ASC)",
                ],
            ),
        ]

        for migration_id, statements in migrations:
            cursor.execute(
                "SELECT 1 FROM schema_migrations WHERE migration_id = ?",
                (migration_id,),
            )
            already_applied = cursor.fetchone()
            if already_applied:
                continue

            for statement in statements:
                try:
                    cursor.execute(statement)
                except Exception as stmt_err:
                    # Некоторые ALTER/DROP могут падать если колонка уже есть/нет —
                    # логируем и продолжаем; миграция всё равно помечается применённой.
                    import logging as _log
                    _log.getLogger(__name__).warning(
                        "Migration %s stmt skipped: %s | %s", migration_id, stmt_err, statement[:80]
                    )

            cursor.execute(
                "INSERT INTO schema_migrations (migration_id) VALUES (?)",
                (migration_id,),
            )
    
    def _compute_bot_stats_for_level(self, level: int) -> Tuple[int, int, int, int]:
        """
        Статы бота по уровню L: точно такой же пул свободных статов как у игрока на этом уровне
        (из таблицы прогрессии), затем распределяются по архетипу с небольшим разбросом.
        """
        from progression_loader import stats_when_reaching_level, hp_when_reaching_level, intermediate_ap_steps_for_level
        lv = max(1, min(MAX_LEVEL, int(level)))

        # Считаем реальный пул свободных статов и авто-HP — точно как у игрока
        total_free = PLAYER_START_FREE_STATS
        auto_hp = 0
        for l in range(1, lv + 1):
            total_free += stats_when_reaching_level(l)
            auto_hp += hp_when_reaching_level(l)
            if l < lv:
                total_free += intermediate_ap_steps_for_level(l)

        # Архетип: веса для (Сила, Ловкость, Интуиция, Выносливость/HP)
        arch = random.choice(("balanced", "brute", "skirmisher", "tank", "intuition"))
        weights = {
            "balanced":   (2, 2, 2, 2),   # равномерно
            "brute":      (4, 1, 1, 2),   # Сила
            "skirmisher": (1, 4, 1, 2),   # Ловкость
            "tank":       (1, 1, 1, 5),   # Выносливость/HP
            "intuition":  (1, 1, 4, 2),   # Интуиция
        }
        ws, we, wc, wh = weights[arch]
        total_w = ws + we + wc + wh

        # Лёгкий разброс ±15% от пула (разные боты одного уровня не одинаковы)
        jitter = random.randint(-(total_free * 15 // 100), total_free * 15 // 100)
        tf = max(0, total_free + jitter)

        pts_s = (tf * ws) // total_w
        pts_e = (tf * we) // total_w
        pts_c = (tf * wc) // total_w
        pts_h = tf - pts_s - pts_e - pts_c  # остаток → HP

        s  = max(1, PLAYER_START_STRENGTH + pts_s)
        e  = max(1, PLAYER_START_ENDURANCE + pts_e)
        c  = max(1, PLAYER_START_CRIT + pts_c)
        hp = max(PLAYER_START_MAX_HP, PLAYER_START_MAX_HP + auto_hp + pts_h * STAMINA_PER_FREE_STAT)
        return s, e, c, hp

    def rebalance_all_bots(self, conn=None) -> None:
        """Пересчитать статы всех ботов по кривой уровня (после обновления баланса)."""
        own_conn = conn is None
        if own_conn:
            conn = self.get_connection()
        cursor = conn.cursor()
        # Supabase: короткие транзакции, иначе statement_timeout при конкурирующих процессах.
        batch_commit = 60 if self._pg else 10**9
        n_done = 0
        try:
            cursor.execute("SELECT bot_id, level FROM bots")
            rows = cursor.fetchall()
            for row in rows:
                bid = int(row["bot_id"])
                lvl = int(row["level"])
                s, e, c, hp = self._compute_bot_stats_for_level(lvl)
                cursor.execute(
                    """
                    UPDATE bots SET strength = ?, endurance = ?, crit = ?,
                    max_hp = ?, current_hp = ? WHERE bot_id = ?
                    """,
                    (s, e, c, hp, hp, bid),
                )
                n_done += 1
                if self._pg and n_done % batch_commit == 0:
                    conn.commit()
            conn.commit()
        finally:
            if own_conn:
                conn.close()

    def create_initial_bots(self, conn=None):
        """
        Дополнить популяцию по таблице BOT_COUNT_BY_LEVEL, затем до TARGET_BOT_POPULATION
        (доп. боты с уровнями 11+ — см. BOT_EXTRA_POPULATION_ABOVE_10).
        """
        own_conn = conn is None
        if own_conn:
            conn = self.get_connection()
        cursor = conn.cursor()
        batch_commit_every = 80
        inserted = 0
        try:
            for level, want in sorted(BOT_COUNT_BY_LEVEL.items()):
                cursor.execute("SELECT COUNT(*) AS cnt FROM bots WHERE level = ?", (level,))
                have = int(cursor.fetchone()["cnt"])
                need = max(0, int(want) - have)
                for _ in range(need):
                    bot_data = self._generate_bot_data(level)
                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO bots
                        (name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        bot_data,
                    )
                    inserted += 1
                    if inserted % batch_commit_every == 0:
                        conn.commit()

            cursor.execute("SELECT COUNT(*) AS cnt FROM bots")
            total = int(cursor.fetchone()["cnt"])
            extra_slots = max(0, int(TARGET_BOT_POPULATION) - total)
            for _ in range(extra_slots):
                level = self._random_bot_level_above_10()
                bot_data = self._generate_bot_data(level)
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO bots
                    (name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    bot_data,
                )
                inserted += 1
                if inserted % batch_commit_every == 0:
                    conn.commit()
            conn.commit()
        finally:
            if own_conn:
                conn.close()

    def _random_bot_level_above_10(self) -> int:
        """Уровень 11..MAX с убывающим весом к высоким (для доп. ботов сверх таблицы)."""
        hi = min(100, int(MAX_LEVEL))
        lo = 11
        if hi < lo:
            return max(1, min(10, int(MAX_LEVEL)))
        r = random.random()
        if r < 0.50:
            return random.randint(lo, min(30, hi))
        if r < 0.80:
            a, b = max(lo, 31), min(50, hi)
            return random.randint(a, b) if a <= b else random.randint(lo, hi)
        a, b = max(lo, 51), hi
        return random.randint(a, b) if a <= b else random.randint(lo, hi)
    
    def _generate_bot_data(self, level):
        """Сгенерировать данные для бота"""
        level = max(1, min(MAX_LEVEL, int(level)))
        # Выбор типа и префикса имени
        if level <= 10:
            bot_type = "novice"
            prefix = random.choice(BOT_PREFIXES["novice"])
        elif level <= 30:
            bot_type = "warrior"
            prefix = random.choice(BOT_PREFIXES["warrior"])
        elif level <= 50:
            bot_type = "master"
            prefix = random.choice(BOT_PREFIXES["master"])
        else:
            bot_type = "legend"
            prefix = random.choice(BOT_PREFIXES["legend"])
        
        name = f"{prefix}_{random.choice(BOT_NAMES)}_{uuid.uuid4().hex[:8]}"
        strength, endurance, crit, max_hp = self._compute_bot_stats_for_level(level)
        ai_patterns = ["aggressive", "defensive", "balanced"]
        ai_pattern = random.choice(ai_patterns)
        return (
            name,
            level,
            strength,
            endurance,
            crit,
            max_hp,
            max_hp,
            bot_type,
            ai_pattern,
        )
    
    def get_or_create_player(self, user_id: int, username: str) -> Dict:
        """Получить или создать игрока"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
        player = cursor.fetchone()
        
        if not player:
            # Старт с ур.1: фиксированные 60 HP и статы; бонус HP из таблицы за «ур.1» не добавляем.
            _g1 = gold_when_reaching_level(1)
            start_max_hp = PLAYER_START_MAX_HP
            cursor.execute(
                '''
                INSERT INTO players
                (user_id, username, level, exp, strength, endurance, crit, max_hp, current_hp,
                 free_stats, gold, exp_milestones)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    user_id,
                    username,
                    PLAYER_START_LEVEL,
                    0,
                    PLAYER_START_STRENGTH,
                    PLAYER_START_ENDURANCE,
                    PLAYER_START_CRIT,
                    start_max_hp,
                    start_max_hp,
                    PLAYER_START_FREE_STATS,
                    _g1,
                    0,
                ),
            )
            self._init_player_improvements_with_cursor(cursor, user_id)
            conn.commit()
            cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
            player = cursor.fetchone()
        
        conn.close()
        return dict(player)
    
    def _init_player_improvements_with_cursor(self, cursor, user_id: int):
        """Инициализировать улучшения для нового игрока в рамках текущей транзакции."""
        improvement_types = ["attack_power", "dodge", "block_mastery", "critical_strike"]
        for imp_type in improvement_types:
            cursor.execute('''
                INSERT OR IGNORE INTO improvements (user_id, improvement_type, level)
                VALUES (?, ?, 0)
            ''', (user_id, imp_type))
    
    def _insert_bot_row(self, cursor, bot_tuple: Tuple[Any, ...]) -> None:
        cursor.execute(
            """
            INSERT OR IGNORE INTO bots
            (name, level, strength, endurance, crit, max_hp, current_hp, bot_type, ai_pattern)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            bot_tuple,
        )

    @staticmethod
    def _normalize_bot_dict(row_dict: Dict) -> Dict:
        """У старых строк в SQLite crit мог быть NULL — для UI и боя нужно число."""
        d = dict(row_dict)
        if d.get("crit") is None:
            d["crit"] = PLAYER_START_CRIT
        return d

    def find_suitable_opponent(self, player_level: int, is_bot_search: bool = True) -> Optional[Dict]:
        """
        Кольца ±0, ±1, ±2… от центра (уровни 1…MAX). Вес 1/(1+K·d²).
        Если пусто — создаётся бот нужного уровня.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if not is_bot_search:
                return None
            center = max(1, min(MAX_LEVEL, int(player_level)))
            rows = []
            for span in range(0, BOT_MATCH_LEVEL_RANGE_MAX + 1):
                lo = max(0, center - span)
                hi = min(MAX_LEVEL, center + span)
                cursor.execute(
                    "SELECT * FROM bots WHERE level BETWEEN ? AND ?",
                    (lo, hi),
                )
                rows = cursor.fetchall()
                if rows:
                    break
            if not rows:
                bot_t = self._generate_bot_data(center)
                self._insert_bot_row(cursor, bot_t)
                conn.commit()
                cursor.execute("SELECT * FROM bots WHERE name = ?", (bot_t[0],))
                row = cursor.fetchone()
                return self._normalize_bot_dict(dict(row)) if row else None
            bots = [self._normalize_bot_dict(dict(r)) for r in rows]
            weights = []
            for b in bots:
                d = abs(int(b["level"]) - center)
                weights.append(1.0 / (1.0 + BOT_MATCH_LEVEL_STRICTNESS * d * d))
            return random.choices(bots, weights=weights, k=1)[0]
        finally:
            conn.close()
    
    def save_battle(self, battle_data: Dict) -> int:
        """Сохранить информацию о бое"""
        conn = self.get_connection()
        cursor = conn.cursor()
        params = (
            battle_data["player1_id"],
            battle_data["player2_id"],
            battle_data["is_bot1"],
            battle_data["is_bot2"],
            battle_data["winner_id"],
            battle_data["result"],
            battle_data["rounds"],
            str(battle_data["details"]),
        )
        if self._pg:
            cursor.execute(
                """
                INSERT INTO battles
                (player1_id, player2_id, is_bot1, is_bot2, winner_id, battle_result,
                 rounds_played, battle_data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING battle_id
                """,
                params,
            )
            battle_id = int(cursor.fetchone()["battle_id"])
        else:
            cursor.execute(
                """
                INSERT INTO battles
                (player1_id, player2_id, is_bot1, is_bot2, winner_id, battle_result,
                 rounds_played, battle_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                params,
            )
            battle_id = int(cursor.lastrowid)
        conn.commit()
        conn.close()

        return battle_id
    
    def update_player_stats(self, user_id: int, stats_update: Dict):
        """Обновить статистику игрока. При смене current_hp сбрасываем last_hp_regen — иначе реген
        посчитает время с прошлой отметки и мгновенно выдаст весь недобор HP после боя."""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        set_clauses = []
        values = []
        
        for key, value in stats_update.items():
            set_clauses.append(f"{key} = ?")
            values.append(value)
        if "current_hp" in stats_update:
            set_clauses.append("last_hp_regen = ?")
            values.append(datetime.utcnow().isoformat())
        
        values.append(user_id)
        
        cursor.execute(f'''
            UPDATE players 
            SET {", ".join(set_clauses)}, last_active = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ''', values)
        
        conn.commit()
        conn.close()
    
    def apply_hp_regen(self, user_id: int, endurance_invested: int) -> Dict:
        """
        Ленивый реген HP: считает сколько HP нагенерилось с момента last_hp_regen и применяет.
        Вызывается при каждом действии игрока — никакого cron не нужно.
        Возвращает {'current_hp': ..., 'max_hp': ...}.
        """
        from datetime import datetime
        from config import HP_REGEN_BASE_SECONDS, HP_REGEN_ENDURANCE_BONUS, PLAYER_START_MAX_HP
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT max_hp, current_hp, last_hp_regen FROM players WHERE user_id = ?",
                (user_id,)
            )
            row = cursor.fetchone()
            if not row:
                return {}
            max_hp = int(row['max_hp'] or PLAYER_START_MAX_HP)
            _raw_ch = row["current_hp"]
            current_hp = max_hp if _raw_ch is None else int(_raw_ch)
            last_regen_str = row['last_hp_regen']
            now = datetime.utcnow()

            if current_hp < max_hp:
                if last_regen_str:
                    try:
                        last_regen = datetime.fromisoformat(last_regen_str)
                    except ValueError:
                        last_regen = now
                else:
                    last_regen = now

                elapsed = max(0.0, (now - last_regen).total_seconds())
                endurance_mult = 1.0 + max(0, int(endurance_invested)) * HP_REGEN_ENDURANCE_BONUS
                regen_per_sec = max_hp / HP_REGEN_BASE_SECONDS * endurance_mult
                hp_gained = int(elapsed * regen_per_sec)
                current_hp = min(max_hp, current_hp + hp_gained)

            cursor.execute(
                "UPDATE players SET current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
                (current_hp, now.isoformat(), user_id)
            )
            conn.commit()
            return {'current_hp': current_hp, 'max_hp': max_hp}
        finally:
            conn.close()

    def apply_hp_regen_from_player(self, player: Dict, endurance_invested: int) -> Dict:
        """
        Быстрая версия apply_hp_regen: принимает уже загруженный dict игрока.
        Экономит 1 лишний SELECT — данные уже есть из get_or_create_player.
        Возвращает {'current_hp': ..., 'max_hp': ...} или {} если ничего не изменилось.
        """
        from datetime import datetime
        from config import HP_REGEN_BASE_SECONDS, HP_REGEN_ENDURANCE_BONUS, PLAYER_START_MAX_HP
        user_id = player.get("user_id")
        if not user_id:
            return {}
        max_hp = int(player.get("max_hp") or PLAYER_START_MAX_HP)
        _raw_ch = player.get("current_hp")
        current_hp = max_hp if _raw_ch is None else int(_raw_ch)
        last_regen_str = player.get("last_hp_regen")
        now = datetime.utcnow()

        if current_hp < max_hp:
            if last_regen_str:
                try:
                    last_regen = datetime.fromisoformat(str(last_regen_str).split("+")[0].split(".")[0] if last_regen_str else "")
                except (ValueError, AttributeError):
                    last_regen = now
            else:
                last_regen = now

            elapsed = max(0.0, (now - last_regen).total_seconds())
            endurance_mult = 1.0 + max(0, int(endurance_invested)) * HP_REGEN_ENDURANCE_BONUS
            regen_per_sec = max_hp / HP_REGEN_BASE_SECONDS * endurance_mult
            hp_gained = int(elapsed * regen_per_sec)
            current_hp = min(max_hp, current_hp + hp_gained)

        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE players SET current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
                (current_hp, now.isoformat(), user_id)
            )
            conn.commit()
        finally:
            conn.close()
        return {'current_hp': current_hp, 'max_hp': max_hp}

    def wipe_player_profile(
        self, user_id: int, *, keep_wallet_clan_and_referrals: bool = False
    ) -> None:
        """
        Сброс прогресса игрока.
        keep_wallet_clan_and_referrals=False (по умолчанию, /wipe_me): удалить строку players и связанное.
        True (оплата USDT полный сброс): оставить золото, алмазы, клан, реферальные поля и таблицы referrals/referral_rewards.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        for table in (
            "improvements",
            "daily_quests",
            "daily_bonuses",
            "achievements",
            "inventory",
        ):
            cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM metric_events WHERE user_id = ?", (user_id,))
        if keep_wallet_clan_and_referrals:
            cursor.execute("DELETE FROM season_stats WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM battle_pass WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM season_rewards WHERE user_id = ?", (user_id,))
            cursor.execute("DELETE FROM pvp_queue WHERE user_id = ?", (user_id,))
            now_iso = datetime.utcnow().isoformat()
            now_ts = int(time.time())
            start_hp = PLAYER_START_MAX_HP
            cursor.execute(
                """
                UPDATE players SET
                    level = ?, exp = 0, exp_milestones = 0,
                    strength = ?, endurance = ?, crit = ?,
                    max_hp = ?, current_hp = ?,
                    free_stats = ?,
                    wins = 0, losses = 0, win_streak = 0, rating = 1000,
                    daily_streak = 0, last_daily = NULL,
                    xp_boost_charges = 0,
                    profile_reset_ts = ?,
                    last_active = CURRENT_TIMESTAMP,
                    last_hp_regen = ?
                WHERE user_id = ?
                """,
                (
                    PLAYER_START_LEVEL,
                    PLAYER_START_STRENGTH,
                    PLAYER_START_ENDURANCE,
                    PLAYER_START_CRIT,
                    start_hp,
                    start_hp,
                    PLAYER_START_FREE_STATS,
                    now_ts,
                    now_iso,
                    user_id,
                ),
            )
            self._init_player_improvements_with_cursor(cursor, user_id)
        else:
            cursor.execute("DELETE FROM players WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
    
    def get_top_players(self, limit: int = 10) -> List[Dict]:
        """Получить топ игроков по рейтингу"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT username, level, rating, wins, losses 
            FROM players 
            WHERE wins + losses > 0
            ORDER BY rating DESC 
            LIMIT ?
        ''', (limit,))
        
        players = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return players
    
    def check_daily_bonus(self, user_id: int) -> Dict:
        """Проверить и выдать ежедневный бонус"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        today = datetime.now().date()
        cursor.execute('''
            SELECT daily_streak, last_daily FROM players WHERE user_id = ?
        ''', (user_id,))
        
        result = cursor.fetchone()
        if not result:
            conn.close()
            return {"can_claim": True, "streak": 0, "bonus": DAILY_BONUS_GOLD}

        streak = result['daily_streak']
        last_daily = result['last_daily']

        if last_daily:
            # PostgreSQL returns datetime.date; SQLite returns a str
            if isinstance(last_daily, str):
                last_date = datetime.strptime(last_daily, '%Y-%m-%d').date()
            else:
                last_date = last_daily
            if last_date == today:
                conn.close()
                return {"can_claim": False, "streak": streak, "bonus": 0}
            elif last_date == today - timedelta(days=1):
                streak += 1
            else:
                streak = 1
        
        # Рассчитываем бонус
        bonus = DAILY_BONUS_GOLD
        if streak % 7 == 0:  # Каждые 7 дней
            bonus += DIAMONDS_DAILY_STREAK
        
        cursor.execute('''
            UPDATE players 
            SET daily_streak = ?, last_daily = ?, gold = gold + ?, diamonds = diamonds + ?
            WHERE user_id = ?
        ''', (streak, today, bonus if bonus > 0 else 0, 
              DIAMONDS_DAILY_STREAK if streak % 7 == 0 else 0, user_id))
        
        conn.commit()
        conn.close()
        
        return {"can_claim": True, "streak": streak, "bonus": bonus}
    
    def get_player_improvements(self, user_id: int) -> Dict:
        """Получить улучшения игрока"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT improvement_type, level FROM improvements 
            WHERE user_id = ?
        ''', (user_id,))
        
        improvements = {}
        for row in cursor.fetchall():
            improvements[row["improvement_type"]] = row["level"]
        
        conn.close()
        return improvements
    
    def upgrade_improvement(self, user_id: int, improvement_type: str) -> bool:
        """Улучшить характеристику"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Получаем текущий уровень
        cursor.execute('''
            SELECT level FROM improvements 
            WHERE user_id = ? AND improvement_type = ?
        ''', (user_id, improvement_type))
        
        result = cursor.fetchone()
        if not result or result["level"] >= IMPROVEMENT_LEVELS:
            conn.close()
            return False
        
        current_level = result["level"]
        new_level = current_level + 1
        
        # Рассчитываем стоимость
        base_cost = self._get_improvement_cost(improvement_type, new_level)
        
        # Проверяем золото
        cursor.execute('SELECT gold AS gold FROM players WHERE user_id = ?', (user_id,))
        player_gold = cursor.fetchone()["gold"]
        
        if player_gold < base_cost:
            conn.close()
            return False
        
        # Обновляем
        cursor.execute('''
            UPDATE improvements SET level = ? 
            WHERE user_id = ? AND improvement_type = ?
        ''', (new_level, user_id, improvement_type))
        
        cursor.execute('''
            UPDATE players SET gold = gold - ? WHERE user_id = ?
        ''', (base_cost, user_id))
        
        conn.commit()
        conn.close()
        return True
    
    def _get_improvement_cost(self, improvement_type: str, level: int) -> int:
        """Рассчитать стоимость улучшения"""
        base_costs = {
            "attack_power": 1000,
            "dodge": 1500,
            "block_mastery": 1200,
            "critical_strike": 2000
        }
        
        base_cost = base_costs.get(improvement_type, 1000)
        return int(base_cost * (IMPROVEMENT_COST_MULTIPLIER ** (level - 1)))

    def log_metric_event(self, event_type: str, user_id: Optional[int] = None, value: int = 0, duration_ms: int = 0):
        """Записать метрику/событие в таблицу metric_events."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT INTO metric_events (event_type, user_id, value, duration_ms)
            VALUES (?, ?, ?, ?)
            ''',
            (event_type, user_id, value, duration_ms),
        )
        conn.commit()
        conn.close()

    def get_health_metrics(self) -> Dict[str, Any]:
        """Получить базовый срез состояния системы."""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) AS total_players FROM players")
        total_players = cursor.fetchone()["total_players"]

        cursor.execute(
            '''
            SELECT COUNT(DISTINCT user_id) AS dau
            FROM metric_events
            WHERE event_type = 'command_start'
              AND created_at >= datetime('now', '-1 day')
            '''
        )
        dau = cursor.fetchone()["dau"] or 0

        cursor.execute(
            '''
            SELECT COUNT(*) AS battles_hour
            FROM metric_events
            WHERE event_type IN ('battle_ended', 'battle_ended_afk')
              AND created_at >= datetime('now', '-1 hour')
            '''
        )
        battles_hour = cursor.fetchone()["battles_hour"] or 0

        cursor.execute(
            '''
            SELECT AVG(duration_ms) AS avg_duration_ms
            FROM metric_events
            WHERE event_type IN ('battle_ended', 'battle_ended_afk')
              AND duration_ms > 0
              AND created_at >= datetime('now', '-1 day')
            '''
        )
        avg_duration_row = cursor.fetchone()["avg_duration_ms"]
        avg_duration_ms = int(avg_duration_row) if avg_duration_row else 0

        conn.close()
        return {
            "total_players": total_players,
            "dau": dau,
            "battles_hour": battles_hour,
            "avg_battle_duration_ms": avg_duration_ms,
        }

    def update_daily_quest_progress(self, user_id: int, won_battle: bool = False):
        """Обновить прогресс ежедневных квестов после боя."""
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            '''
            INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed)
            VALUES (?, ?, 0, 0, 0)
            ''',
            (user_id, today),
        )

        cursor.execute(
            '''
            UPDATE daily_quests
            SET battles_played = battles_played + 1,
                battles_won = battles_won + ?
            WHERE user_id = ? AND quest_date = ?
            ''',
            (1 if won_battle else 0, user_id, today),
        )
        conn.commit()
        conn.close()

    def get_daily_quest_status(self, user_id: int) -> Dict[str, Any]:
        """Получить текущий статус ежедневных квестов."""
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            '''
            INSERT OR IGNORE INTO daily_quests (user_id, quest_date, battles_played, battles_won, reward_claimed)
            VALUES (?, ?, 0, 0, 0)
            ''',
            (user_id, today),
        )

        cursor.execute(
            '''
            SELECT battles_played, battles_won, reward_claimed
            FROM daily_quests
            WHERE user_id = ? AND quest_date = ?
            ''',
            (user_id, today),
        )
        row = cursor.fetchone()
        conn.commit()
        conn.close()

        battles_played = row["battles_played"] if row else 0
        battles_won = row["battles_won"] if row else 0
        reward_claimed = bool(row["reward_claimed"]) if row else False
        is_completed = battles_played >= 3 and battles_won >= 1
        return {
            "battles_played": battles_played,
            "battles_won": battles_won,
            "reward_claimed": reward_claimed,
            "is_completed": is_completed,
        }

    def claim_daily_quest_reward(self, user_id: int, gold_reward: int = 40, diamonds_reward: int = 1) -> Dict[str, Any]:
        """Выдать награду за выполненный ежедневный квест."""
        today = datetime.now().date().isoformat()
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            '''
            SELECT battles_played, battles_won, reward_claimed
            FROM daily_quests
            WHERE user_id = ? AND quest_date = ?
            ''',
            (user_id, today),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Квест еще не начат"}

        if row["reward_claimed"]:
            conn.close()
            return {"ok": False, "reason": "Награда уже получена"}

        if row["battles_played"] < 3 or row["battles_won"] < 1:
            conn.close()
            return {"ok": False, "reason": "Квест еще не выполнен"}

        # Атомарный UPDATE: изменяем только если reward_claimed ещё 0
        # (защита от двойного клика / race condition)
        cursor.execute(
            '''
            UPDATE daily_quests
            SET reward_claimed = 1
            WHERE user_id = ? AND quest_date = ? AND reward_claimed = 0
            ''',
            (user_id, today),
        )
        if cursor.rowcount == 0:
            conn.close()
            return {"ok": False, "reason": "Награда уже получена"}

        cursor.execute(
            '''
            UPDATE players
            SET gold = gold + ?, diamonds = diamonds + ?
            WHERE user_id = ?
            ''',
            (gold_reward, diamonds_reward, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "gold": gold_reward, "diamonds": diamonds_reward}

    # ------------------------------------------------------------------
    # chat_id (нужен для push-уведомлений и PvP)
    # ------------------------------------------------------------------

    def update_chat_id(self, user_id: int, chat_id: int) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE players SET chat_id = ? WHERE user_id = ?", (chat_id, user_id))
        conn.commit()
        conn.close()

    def get_players_with_chat_id(self, limit: int = 1000) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT user_id, chat_id, username FROM players WHERE chat_id IS NOT NULL LIMIT ?",
            (limit,),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    # ------------------------------------------------------------------
    # PvP очередь
    # ------------------------------------------------------------------

    def pvp_enqueue(self, user_id: int, level: int, chat_id: int, message_id: Optional[int] = None) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (?, ?, ?, ?)",
            (user_id, level, chat_id, message_id),
        )
        conn.commit()
        conn.close()

    def pvp_dequeue(self, user_id: int) -> None:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM pvp_queue WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()

    def pvp_find_opponent(self, user_id: int, level: int, range_max: int = 3) -> Optional[Dict]:
        """Найти оппонента в очереди в диапазоне ±range_max уровней (не сам игрок)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        lo = max(1, level - range_max)
        hi = min(MAX_LEVEL, level + range_max)
        cursor.execute(
            """SELECT * FROM pvp_queue
               WHERE user_id != ? AND level BETWEEN ? AND ?
               ORDER BY ABS(level - ?) ASC, joined_at ASC
               LIMIT 1""",
            (user_id, lo, hi, level),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def pvp_clear_stale(self, older_than_seconds: int = 60) -> int:
        """Убрать из очереди игроков, которые ждут дольше N секунд."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM pvp_queue WHERE joined_at < datetime('now', ? || ' seconds')",
            (f"-{older_than_seconds}",),
        )
        deleted = cursor.rowcount
        conn.commit()
        conn.close()
        return deleted

    # ------------------------------------------------------------------
    # PvP вызовы по нику
    # ------------------------------------------------------------------

    @staticmethod
    def _norm_username(username: str) -> str:
        return (username or "").strip().lstrip("@").lower()

    def find_player_by_username(self, username: str) -> Optional[Dict]:
        """Найти игрока по нику (без @, регистронезависимо)."""
        un = self._norm_username(username)
        if not un:
            return None
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT user_id, username, level, rating, current_hp, max_hp
            FROM players
            WHERE username IS NOT NULL AND LOWER(username) = ?
            LIMIT 1
            """,
            (un,),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def search_players_by_username(self, query: str, limit: int = 5) -> List[Dict]:
        """Поиск игроков по частичному совпадению ника."""
        q = self._norm_username(query)
        if not q:
            return []
        conn = self.get_connection()
        cursor = conn.cursor()
        like = f"%{q}%"
        cursor.execute(
            """
            SELECT user_id, username, level, rating
            FROM players
            WHERE username IS NOT NULL AND LOWER(username) LIKE ?
            ORDER BY CASE WHEN LOWER(username) = ? THEN 0 ELSE 1 END,
                     rating DESC
            LIMIT ?
            """,
            (like, q, int(limit)),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def create_pvp_challenge(self, challenger_id: int, target_id: int, ttl_seconds: int = 300) -> Dict[str, Any]:
        """Создать вызов на PvP по нику (один входящий pending на цель)."""
        now_ts = int(time.time())
        exp_ts = now_ts + max(60, int(ttl_seconds))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?",
                (now_ts,),
            )
            cursor.execute(
                "SELECT id FROM pvp_challenges WHERE target_id = ? AND status = 'pending' AND expires_at > ? LIMIT 1",
                (target_id, now_ts),
            )
            if cursor.fetchone():
                conn.commit()
                return {"ok": False, "reason": "target_has_pending"}
            cursor.execute(
                """
                INSERT INTO pvp_challenges (challenger_id, target_id, status, expires_at)
                VALUES (?, ?, 'pending', ?)
                """,
                (challenger_id, target_id, exp_ts),
            )
            cid = int(cursor.lastrowid) if not self._pg else None
            if self._pg and cid is None:
                cursor.execute(
                    "SELECT id FROM pvp_challenges WHERE challenger_id = ? AND target_id = ? AND expires_at = ? ORDER BY id DESC LIMIT 1",
                    (challenger_id, target_id, exp_ts),
                )
                rr = cursor.fetchone()
                cid = int(rr["id"]) if rr else 0
            conn.commit()
            return {"ok": True, "challenge_id": cid, "expires_at": exp_ts}
        finally:
            conn.close()

    def get_incoming_pvp_challenge(self, target_id: int) -> Optional[Dict]:
        """Вернуть 1 актуальный входящий вызов для цели."""
        now_ts = int(time.time())
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?",
                (now_ts,),
            )
            cursor.execute(
                """
                SELECT c.id, c.challenger_id, c.target_id, c.expires_at, c.created_at,
                       p.username AS challenger_username, p.level AS challenger_level, p.rating AS challenger_rating
                FROM pvp_challenges c
                JOIN players p ON p.user_id = c.challenger_id
                WHERE c.target_id = ? AND c.status = 'pending' AND c.expires_at > ?
                ORDER BY c.created_at DESC
                LIMIT 1
                """,
                (target_id, now_ts),
            )
            row = cursor.fetchone()
            conn.commit()
            return dict(row) if row else None
        finally:
            conn.close()

    def get_outgoing_pvp_challenges(self, challenger_id: int, limit: int = 10) -> List[Dict]:
        now_ts = int(time.time())
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?",
                (now_ts,),
            )
            cursor.execute(
                """
                SELECT c.id, c.target_id, c.status, c.expires_at, c.created_at,
                       p.username AS target_username, p.level AS target_level, p.rating AS target_rating
                FROM pvp_challenges c
                JOIN players p ON p.user_id = c.target_id
                WHERE c.challenger_id = ?
                ORDER BY c.created_at DESC
                LIMIT ?
                """,
                (challenger_id, int(limit)),
            )
            rows = [dict(r) for r in cursor.fetchall()]
            conn.commit()
            return rows
        finally:
            conn.close()

    def cancel_pvp_challenge(self, challenge_id: int, challenger_id: int) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE pvp_challenges SET status = 'expired' WHERE id = ? AND challenger_id = ? AND status = 'pending'",
                (int(challenge_id), challenger_id),
            )
            ok = cursor.rowcount > 0
            conn.commit()
            return ok
        finally:
            conn.close()

    def respond_pvp_challenge(self, challenge_id: int, target_id: int, accept: bool) -> Optional[Dict]:
        """Принять/отклонить вызов. Возвращает challenge row при успехе."""
        now_ts = int(time.time())
        status = "accepted" if accept else "declined"
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT id, challenger_id, target_id, status, expires_at
                FROM pvp_challenges
                WHERE id = ? AND target_id = ? AND status = 'pending' AND expires_at > ?
                LIMIT 1
                """,
                (challenge_id, target_id, now_ts),
            )
            row = cursor.fetchone()
            if not row:
                return None
            cursor.execute(
                "UPDATE pvp_challenges SET status = ? WHERE id = ?",
                (status, challenge_id),
            )
            conn.commit()
            out = dict(row)
            out["status"] = status
            return out
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Башня титанов + недельные клеймы
    # ------------------------------------------------------------------

    def get_titan_progress(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, best_floor, current_floor, weekly_best_floor, weekly_best_at FROM titan_progress WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                cursor.execute(
                    "INSERT INTO titan_progress (user_id, best_floor, current_floor, weekly_best_floor, weekly_best_at) VALUES (?, 0, 1, 0, 0)",
                    (user_id,),
                )
                conn.commit()
                return {"user_id": user_id, "best_floor": 0, "current_floor": 1, "weekly_best_floor": 0, "weekly_best_at": 0}
            return dict(row)
        finally:
            conn.close()

    def titan_on_win(self, user_id: int, floor: int) -> Dict[str, Any]:
        now_ts = int(time.time())
        floor_i = max(1, int(floor))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            prog = self.get_titan_progress(user_id)
            best_floor = max(int(prog.get("best_floor", 0)), floor_i)
            current_floor = max(int(prog.get("current_floor", 1)), floor_i + 1)
            weekly_best = int(prog.get("weekly_best_floor", 0))
            weekly_at = int(prog.get("weekly_best_at", 0))
            if floor_i > weekly_best:
                weekly_best = floor_i
                weekly_at = now_ts
            cursor.execute(
                """
                UPDATE titan_progress
                SET best_floor = ?, current_floor = ?, weekly_best_floor = ?, weekly_best_at = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
                """,
                (best_floor, current_floor, weekly_best, weekly_at, user_id),
            )
            conn.commit()
            try:
                self.record_titan_weekly_floor(user_id, floor_i, now_ts)
            except Exception as ex:
                _log.warning("record_titan_weekly_floor uid=%s: %s", user_id, ex)
            return {
                "best_floor": best_floor,
                "current_floor": current_floor,
                "weekly_best_floor": weekly_best,
                "weekly_best_at": weekly_at,
            }
        finally:
            conn.close()

    def titan_on_loss(self, user_id: int, floor: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            prog = self.get_titan_progress(user_id)
            next_floor = max(1, int(floor))
            cursor.execute(
                "UPDATE titan_progress SET current_floor = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                (next_floor, user_id),
            )
            conn.commit()
            prog["current_floor"] = next_floor
            return dict(prog)
        finally:
            conn.close()

    def get_titan_weekly_top(self, limit: int = 50, week_key: Optional[str] = None) -> List[Dict]:
        """Текущая ISO-неделя по UTC; рейтинг из titan_weekly_scores (этажи за эту неделю)."""
        wk = week_key if week_key is not None else iso_week_key_utc()
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT s.user_id, p.username, s.max_floor AS weekly_best_floor, s.best_at AS weekly_best_at
                FROM titan_weekly_scores s
                JOIN players p ON p.user_id = s.user_id
                WHERE s.week_key = ? AND s.max_floor > 0
                ORDER BY s.max_floor DESC, s.best_at ASC
                LIMIT ?
                """,
                (wk, int(limit)),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def record_titan_weekly_floor(self, user_id: int, floor: int, ts: Optional[int] = None) -> None:
        """Зафиксировать лучший этаж за текущую ISO-неделю (для недельного топа и наград)."""
        ts_i = int(ts if ts is not None else time.time())
        wk = iso_week_key_utc(float(ts_i))
        floor_i = max(1, int(floor))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT max_floor, best_at FROM titan_weekly_scores WHERE user_id = ? AND week_key = ?",
                (int(user_id), wk),
            )
            row = cursor.fetchone()
            if not row:
                cursor.execute(
                    "INSERT INTO titan_weekly_scores (user_id, week_key, max_floor, best_at) VALUES (?, ?, ?, ?)",
                    (int(user_id), wk, floor_i, ts_i),
                )
            else:
                mf = int(row["max_floor"] or 0)
                ba = int(row["best_at"] or 0)
                if floor_i > mf or (floor_i == mf and ts_i < ba):
                    cursor.execute(
                        "UPDATE titan_weekly_scores SET max_floor = ?, best_at = ? WHERE user_id = ? AND week_key = ?",
                        (floor_i, ts_i, int(user_id), wk),
                    )
            conn.commit()
        finally:
            conn.close()

    def get_pvp_weekly_top(self, limit: int = 50) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if self._pg:
                cursor.execute(
                    """
                    SELECT user_id, username, wins, losses, rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = FALSE
                          AND b.created_at >= date_trunc('week', now())
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = FALSE
                          AND b.created_at >= date_trunc('week', now())
                        GROUP BY b.player2_id, p.username
                    ) s
                    GROUP BY user_id, username
                    ORDER BY wins DESC, rating_delta DESC, losses ASC
                    LIMIT ?
                    """,
                    (int(limit),),
                )
            else:
                cursor.execute(
                    """
                    SELECT user_id, username, wins, losses, rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = 0
                          AND date(b.created_at) >= date('now', 'weekday 1', '-7 days')
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = 0
                          AND date(b.created_at) >= date('now', 'weekday 1', '-7 days')
                        GROUP BY b.player2_id, p.username
                    ) s
                    GROUP BY user_id, username
                    ORDER BY wins DESC, rating_delta DESC, losses ASC
                    LIMIT ?
                    """,
                    (int(limit),),
                )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def get_pvp_weekly_top_for_period(self, start_dt: datetime, end_dt: datetime, limit: int = 50) -> List[Dict]:
        """Топ PvP за интервал [start_dt, end_dt) по UTC (для автоначисления за прошлую неделю)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if self._pg:
                cursor.execute(
                    """
                    SELECT user_id, username,
                           SUM(wins) AS wins, SUM(losses) AS losses, SUM(rating_delta) AS rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = FALSE
                          AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = FALSE
                          AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player2_id, p.username
                    ) s
                    GROUP BY user_id, username
                    ORDER BY wins DESC, rating_delta DESC, losses ASC
                    LIMIT ?
                    """,
                    (start_dt, end_dt, start_dt, end_dt, int(limit)),
                )
            else:
                ss = start_dt.strftime("%Y-%m-%d %H:%M:%S")
                ee = end_dt.strftime("%Y-%m-%d %H:%M:%S")
                cursor.execute(
                    """
                    SELECT user_id, username,
                           SUM(wins) AS wins, SUM(losses) AS losses, SUM(rating_delta) AS rating_delta
                    FROM (
                        SELECT b.player1_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player1_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player1_id
                        WHERE b.is_bot2 = 0
                          AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player1_id, p.username
                        UNION ALL
                        SELECT b.player2_id AS user_id, p.username,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 1 ELSE 0 END) AS wins,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 0 ELSE 1 END) AS losses,
                               SUM(CASE WHEN b.winner_id = b.player2_id THEN 12 ELSE -8 END) AS rating_delta
                        FROM battles b
                        JOIN players p ON p.user_id = b.player2_id
                        WHERE b.is_bot2 = 0
                          AND b.created_at >= ? AND b.created_at < ?
                        GROUP BY b.player2_id, p.username
                    ) s
                    GROUP BY user_id, username
                    ORDER BY wins DESC, rating_delta DESC, losses ASC
                    LIMIT ?
                    """,
                    (ss, ee, ss, ee, int(limit)),
                )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def get_pvp_elo_top(self, limit: int = 20) -> List[Dict]:
        """Топ игроков по ELO рейтингу (all-time)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, username, rating, wins, losses "
                "FROM players "
                "WHERE wins + losses > 0 "
                "ORDER BY rating DESC "
                "LIMIT ?",
                (int(limit),),
            )
            return [dict(r) for r in cursor.fetchall()]
        finally:
            conn.close()

    def weekly_payout_already_done(self, week_key: str, board: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM weekly_leaderboard_payouts WHERE week_key = ? AND board = ? LIMIT 1",
                (week_key, board),
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()

    def process_weekly_leaderboard_payouts(self) -> Dict[str, Any]:
        """
        Выдать алмазы и титулы за прошлую ISO-неделю (PvP по боям, Башня по titan_weekly_scores).
        Идемпотентно: повторный вызов не дублирует выплаты.
        """
        week_key, start_dt, end_dt = prev_iso_week_bounds_utc()
        out: Dict[str, Any] = {
            "week_key": week_key,
            "pvp_paid": 0,
            "titan_paid": 0,
            "invalidate_uids": [],
            "telegram": [],
        }

        if not self.weekly_payout_already_done(week_key, "pvp"):
            rows = self.get_pvp_weekly_top_for_period(start_dt, end_dt, limit=20)
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                for idx, r in enumerate(rows[:10], 1):
                    d, title = weekly_pvp_rank_reward(idx)
                    if d <= 0:
                        continue
                    uid = int(r["user_id"])
                    cursor.execute(
                        "UPDATE players SET diamonds = diamonds + ?, display_title = ? WHERE user_id = ?",
                        (d, title, uid),
                    )
                    out["invalidate_uids"].append(uid)
                    self.log_metric_event("weekly_pvp_lb_reward", uid, value=d)
                    cid = self.get_player_chat_id(uid)
                    if cid:
                        out["telegram"].append({
                            "chat_id": cid,
                            "text": (
                                f"🏆 <b>Награда за неделю {week_key}</b> (топ PvP)\n\n"
                                f"Место: <b>#{idx}</b>\n+{d} 💎\nТитул: «{title}»"
                            ),
                        })
                cursor.execute(
                    "INSERT INTO weekly_leaderboard_payouts (week_key, board) VALUES (?, ?)",
                    (week_key, "pvp"),
                )
                conn.commit()
                out["pvp_paid"] = min(10, len(rows))
            except Exception as ex:
                conn.rollback()
                _log.exception("weekly PvP payout failed: %s", ex)
            finally:
                conn.close()

        if not self.weekly_payout_already_done(week_key, "titan"):
            conn = self.get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    """
                    SELECT s.user_id, p.username, s.max_floor, s.best_at
                    FROM titan_weekly_scores s
                    JOIN players p ON p.user_id = s.user_id
                    WHERE s.week_key = ? AND s.max_floor > 0
                    ORDER BY s.max_floor DESC, s.best_at ASC
                    LIMIT 20
                    """,
                    (week_key,),
                )
                rows = [dict(x) for x in cursor.fetchall()]
                for idx, r in enumerate(rows[:10], 1):
                    d, title = weekly_titan_rank_reward(idx)
                    if d <= 0:
                        continue
                    uid = int(r["user_id"])
                    cursor.execute(
                        "UPDATE players SET diamonds = diamonds + ?, display_title = ? WHERE user_id = ?",
                        (d, title, uid),
                    )
                    out["invalidate_uids"].append(uid)
                    self.log_metric_event("weekly_titan_lb_reward", uid, value=d)
                    cid = self.get_player_chat_id(uid)
                    if cid:
                        out["telegram"].append({
                            "chat_id": cid,
                            "text": (
                                f"🗿 <b>Награда за неделю {week_key}</b> (Башня Титанов)\n\n"
                                f"Место: <b>#{idx}</b>\n+{d} 💎\nТитул: «{title}»"
                            ),
                        })
                cursor.execute(
                    "INSERT INTO weekly_leaderboard_payouts (week_key, board) VALUES (?, ?)",
                    (week_key, "titan"),
                )
                conn.commit()
                out["titan_paid"] = min(10, len(rows))
            except Exception as ex:
                conn.rollback()
                _log.exception("weekly Titan payout failed: %s", ex)
            finally:
                conn.close()

        # уникальные uid для сброса кэша API
        out["invalidate_uids"] = list(dict.fromkeys(out["invalidate_uids"]))
        return out

    def get_recent_pvp_duel_count(self, user_a: int, user_b: int, hours: int = 24) -> int:
        ua, ub = sorted((int(user_a), int(user_b)))
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            if self._pg:
                cursor.execute(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM battles
                    WHERE is_bot2 = FALSE
                      AND created_at >= (NOW() - (?::text || ' hours')::interval)
                      AND LEAST(player1_id, player2_id) = ?
                      AND GREATEST(player1_id, player2_id) = ?
                    """,
                    (str(int(hours)), ua, ub),
                )
            else:
                cursor.execute(
                    """
                    SELECT COUNT(*) AS cnt
                    FROM battles
                    WHERE is_bot2 = 0
                      AND created_at >= datetime('now', ?)
                      AND min(player1_id, player2_id) = ?
                      AND max(player1_id, player2_id) = ?
                    """,
                    (f"-{int(hours)} hours", ua, ub),
                )
            row = cursor.fetchone()
            return int((row or {}).get("cnt", 0))
        finally:
            conn.close()

    def get_week_key(self) -> str:
        now = datetime.utcnow()
        y, w, _ = now.isocalendar()
        return f"{y}-W{int(w):02d}"

    def has_weekly_claim(self, user_id: int, week_key: str, claim_key: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM weekly_claims WHERE user_id = ? AND week_key = ? AND claim_key = ? LIMIT 1",
                (user_id, week_key, claim_key),
            )
            return bool(cursor.fetchone())
        finally:
            conn.close()

    def add_weekly_claim(self, user_id: int, week_key: str, claim_key: str) -> bool:
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO weekly_claims (user_id, week_key, claim_key) VALUES (?, ?, ?)",
                (user_id, week_key, claim_key),
            )
            ok = cursor.rowcount > 0
            conn.commit()
            return ok
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Сезоны
    # ------------------------------------------------------------------

    def get_active_season(self) -> Optional[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM seasons WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def update_season_stats(self, user_id: int, won: bool) -> None:
        season = self.get_active_season()
        if not season:
            return
        sid = season["id"]
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO season_stats (season_id, user_id) VALUES (?, ?)",
            (sid, user_id),
        )
        if won:
            cursor.execute(
                "UPDATE season_stats SET wins = wins + 1, rating = rating + 10 WHERE season_id = ? AND user_id = ?",
                (sid, user_id),
            )
        else:
            cursor.execute(
                "UPDATE season_stats SET losses = losses + 1, rating = MAX(900, rating - 5) WHERE season_id = ? AND user_id = ?",
                (sid, user_id),
            )
        conn.commit()
        conn.close()

    def get_season_leaderboard(self, season_id: int, limit: int = 10) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT ss.user_id, p.username, ss.wins, ss.losses, ss.rating
               FROM season_stats ss
               JOIN players p ON p.user_id = ss.user_id
               WHERE ss.season_id = ?
               ORDER BY ss.rating DESC, ss.wins DESC
               LIMIT ?""",
            (season_id, limit),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    def end_season(self, new_season_name: str) -> Dict[str, Any]:
        """Завершить текущий сезон, выдать награды топ-3, создать новый."""
        season = self.get_active_season()
        if not season:
            return {"ok": False, "reason": "Нет активного сезона"}
        sid = season["id"]
        conn = self.get_connection()
        cursor = conn.cursor()
        # Завершаем
        cursor.execute(
            "UPDATE seasons SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?",
            (sid,),
        )
        # Топ-3 → награды
        cursor.execute(
            """SELECT user_id, rating FROM season_stats
               WHERE season_id = ? ORDER BY rating DESC LIMIT 3""",
            (sid,),
        )
        top3 = cursor.fetchall()
        rewards_diamonds = [100, 50, 25]
        titles = ["Чемпион сезона", "Серебро сезона", "Бронза сезона"]
        for i, row in enumerate(top3):
            uid = row["user_id"]
            d = rewards_diamonds[i]
            t = titles[i]
            cursor.execute(
                "INSERT INTO season_rewards (season_id, user_id, rank, diamonds, reward_title) VALUES (?, ?, ?, ?, ?)",
                (sid, uid, i + 1, d, t),
            )
            cursor.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (d, uid))
        # Создаём новый сезон
        if self._pg:
            cursor.execute(
                "INSERT INTO seasons (name, status) VALUES (%s, 'active') RETURNING id",
                (new_season_name,),
            )
            new_sid = int(cursor.fetchone()["id"])
        else:
            cursor.execute(
                "INSERT INTO seasons (name, status) VALUES (?, 'active')",
                (new_season_name,),
            )
            new_sid = int(cursor.lastrowid)
        conn.commit()
        conn.close()
        return {"ok": True, "ended_season_id": sid, "new_season_id": new_sid, "rewarded": len(top3)}

    # ------------------------------------------------------------------
    # Shop buffs (HP зелье, XP буст)
    # ------------------------------------------------------------------

    def buy_hp_potion_small(self, user_id: int) -> Dict[str, Any]:
        """Малое зелье HP: восстанавливает 30% max HP. Стоит 12 золота."""
        COST = 12
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        max_hp     = int(row["max_hp"] or 100)
        current_hp = int(row["current_hp"] or max_hp)
        restore    = int(max_hp * 0.30)
        new_hp     = min(max_hp, current_hp + restore)
        if current_hp >= max_hp:
            conn.close()
            return {"ok": False, "reason": "HP уже полное!"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
            (COST, new_hp, datetime.utcnow().isoformat(), user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "hp_restored": new_hp - current_hp, "new_hp": new_hp, "max_hp": max_hp}

    def buy_hp_potion(self, user_id: int) -> Dict[str, Any]:
        """Зелье HP: восстанавливает текущий HP до максимума. Стоит 30 золота."""
        COST = 30
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, current_hp = max_hp, last_hp_regen = ? WHERE user_id = ?",
            (COST, datetime.utcnow().isoformat(), user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "hp_restored": row["max_hp"] - row["current_hp"]}

    def buy_xp_boost(self, user_id: int) -> Dict[str, Any]:
        """XP буст +50% на 5 боёв. Стоит 100 золота."""
        COST = 100
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT gold, xp_boost_charges FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["gold"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} золота, у вас {row['gold']}"}
        cursor.execute(
            "UPDATE players SET gold = gold - ?, xp_boost_charges = xp_boost_charges + 5 WHERE user_id = ?",
            (COST, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "charges_added": 5}

    def buy_stat_reset(self, user_id: int) -> Dict[str, Any]:
        """Сброс статов за 50 алмазов."""
        COST = RESET_STATS_COST_DIAMONDS
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT diamonds, level FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "reason": "Игрок не найден"}
        if row["diamonds"] < COST:
            conn.close()
            return {"ok": False, "reason": f"Нужно {COST} алмазов, у вас {row['diamonds']}"}
        # Сколько свободных статов по таблице за все достигнутые уровни (как при создании + апах)
        from config import stats_when_reaching_level, PLAYER_START_FREE_STATS, expected_max_hp_from_level
        plv = int(row["level"])
        total_free = PLAYER_START_FREE_STATS
        for lv in range(2, plv + 1):
            total_free += stats_when_reaching_level(lv)
        reset_hp = expected_max_hp_from_level(plv)
        cursor.execute(
            """UPDATE players SET diamonds = diamonds - ?,
               strength = ?, endurance = ?, crit = ?,
               max_hp = ?, current_hp = ?, free_stats = ?, exp_milestones = 0,
               last_hp_regen = ?
               WHERE user_id = ?""",
            (
                COST,
                PLAYER_START_STRENGTH,
                PLAYER_START_ENDURANCE,
                PLAYER_START_CRIT,
                reset_hp,
                reset_hp,
                total_free,
                datetime.utcnow().isoformat(),
                user_id,
            ),
        )
        cursor.execute("UPDATE improvements SET level = 0 WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return {"ok": True, "cost": COST, "free_stats": total_free}

    def consume_xp_boost_charge(self, user_id: int) -> bool:
        """Использовать 1 заряд XP буста. Возвращает True если буст был активен."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT xp_boost_charges FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or (row["xp_boost_charges"] or 0) <= 0:
            conn.close()
            return False
        cursor.execute(
            "UPDATE players SET xp_boost_charges = xp_boost_charges - 1 WHERE user_id = ?",
            (user_id,),
        )
        conn.commit()
        conn.close()
        return True

    # ------------------------------------------------------------------
    # Battle Pass
    # ------------------------------------------------------------------

    # Треки Battle Pass: {tier: (battles_needed, wins_needed, reward_diamonds, reward_gold)}
    BATTLE_PASS_TIERS = [
        (3,  1,  5,  50),   # Tier 1
        (10, 3,  10, 100),  # Tier 2
        (25, 8,  20, 200),  # Tier 3
        (50, 20, 50, 500),  # Tier 4
        (100,40, 100,1000), # Tier 5
    ]

    def get_battle_pass(self, user_id: int, season_id: Optional[int] = None) -> Dict[str, Any]:
        if season_id is None:
            s = self.get_active_season()
            season_id = s["id"] if s else 1
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)",
            (user_id, season_id),
        )
        cursor.execute(
            "SELECT * FROM battle_pass WHERE user_id = ? AND season_id = ?",
            (user_id, season_id),
        )
        row = dict(cursor.fetchone())
        conn.commit()
        conn.close()
        return row

    def update_battle_pass(self, user_id: int, won: bool) -> None:
        s = self.get_active_season()
        sid = s["id"] if s else 1
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)",
            (user_id, sid),
        )
        cursor.execute(
            "UPDATE battle_pass SET battles_done = battles_done + 1, wins_done = wins_done + ? WHERE user_id = ? AND season_id = ?",
            (1 if won else 0, user_id, sid),
        )
        conn.commit()
        conn.close()

    def claim_battle_pass_tier(self, user_id: int, tier: int) -> Dict[str, Any]:
        """Забрать награду за тир Battle Pass (0-based tier index)."""
        s = self.get_active_season()
        sid = s["id"] if s else 1
        bp = self.get_battle_pass(user_id, sid)
        if tier <= bp["last_claimed_tier"]:
            return {"ok": False, "reason": "Тир уже получен"}
        if tier > len(self.BATTLE_PASS_TIERS):
            return {"ok": False, "reason": "Тир не существует"}
        # Проверяем условия каждого тира до запрашиваемого
        for i in range(bp["last_claimed_tier"], tier):
            b_need, w_need, _, _ = self.BATTLE_PASS_TIERS[i]
            if bp["battles_done"] < b_need or bp["wins_done"] < w_need:
                return {"ok": False, "reason": f"Тир {i+1} ещё не выполнен"}
        # Выдаём все тиры с last_claimed+1 до tier
        total_d = total_g = 0
        for i in range(bp["last_claimed_tier"], tier):
            _, _, d, g = self.BATTLE_PASS_TIERS[i]
            total_d += d
            total_g += g
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE battle_pass SET last_claimed_tier = ? WHERE user_id = ? AND season_id = ?",
            (tier, user_id, sid),
        )
        cursor.execute(
            "UPDATE players SET diamonds = diamonds + ?, gold = gold + ? WHERE user_id = ?",
            (total_d, total_g, user_id),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "diamonds": total_d, "gold": total_g}

    # ------------------------------------------------------------------
    # Кланы
    # ------------------------------------------------------------------

    CLAN_CREATE_COST_GOLD = 200

    def create_clan(self, leader_id: int, name: str, tag: str) -> Dict[str, Any]:
        tag = tag.upper()[:4]
        if len(name) < 3 or len(name) > 20:
            return {"ok": False, "reason": "Имя клана: 3–20 символов"}
        if len(tag) < 2 or len(tag) > 4:
            return {"ok": False, "reason": "Тег клана: 2–4 символа"}
        conn = self.get_connection()
        cursor = conn.cursor()
        # Проверяем не состоит ли уже в клане
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (leader_id,))
        row = cursor.fetchone()
        if row and row["clan_id"]:
            conn.close()
            return {"ok": False, "reason": "Вы уже состоите в клане"}
        # Проверяем золото
        cursor.execute("SELECT gold FROM players WHERE user_id = ?", (leader_id,))
        gold_row = cursor.fetchone()
        if not gold_row or gold_row["gold"] < self.CLAN_CREATE_COST_GOLD:
            conn.close()
            return {"ok": False, "reason": f"Нужно {self.CLAN_CREATE_COST_GOLD} золота"}
        try:
            if self._pg:
                cursor.execute(
                    "INSERT INTO clans (name, tag, leader_id) VALUES (%s, %s, %s) RETURNING id",
                    (name, tag, leader_id),
                )
                clan_id = int(cursor.fetchone()["id"])
            else:
                cursor.execute(
                    "INSERT INTO clans (name, tag, leader_id) VALUES (?, ?, ?)",
                    (name, tag, leader_id),
                )
                clan_id = int(cursor.lastrowid)
            cursor.execute(
                "INSERT INTO clan_members (user_id, clan_id, role) VALUES (?, ?, 'leader')",
                (leader_id, clan_id),
            )
            cursor.execute(
                "UPDATE players SET gold = gold - ?, clan_id = ? WHERE user_id = ?",
                (self.CLAN_CREATE_COST_GOLD, clan_id, leader_id),
            )
            conn.commit()
            return {"ok": True, "clan_id": clan_id, "name": name, "tag": tag}
        except Exception as e:
            conn.rollback()
            return {"ok": False, "reason": "Клан с таким именем или тегом уже существует"}
        finally:
            conn.close()

    def join_clan(self, user_id: int, clan_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row and row["clan_id"]:
            conn.close()
            return {"ok": False, "reason": "Вы уже состоите в клане"}
        cursor.execute("SELECT id, name FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if not clan:
            conn.close()
            return {"ok": False, "reason": "Клан не найден"}
        # Лимит 20 человек
        cursor.execute("SELECT COUNT(*) as cnt FROM clan_members WHERE clan_id = ?", (clan_id,))
        if cursor.fetchone()["cnt"] >= 20:
            conn.close()
            return {"ok": False, "reason": "Клан полон (макс. 20 человек)"}
        cursor.execute(
            "INSERT INTO clan_members (user_id, clan_id) VALUES (?, ?)",
            (user_id, clan_id),
        )
        cursor.execute("UPDATE players SET clan_id = ? WHERE user_id = ?", (clan_id, user_id))
        conn.commit()
        conn.close()
        return {"ok": True, "clan_name": clan["name"]}

    def leave_clan(self, user_id: int) -> Dict[str, Any]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT clan_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or not row["clan_id"]:
            conn.close()
            return {"ok": False, "reason": "Вы не в клане"}
        clan_id = row["clan_id"]
        # Лидер не может выйти без передачи
        cursor.execute("SELECT leader_id FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if clan and clan["leader_id"] == user_id:
            conn.close()
            return {"ok": False, "reason": "Лидер не может покинуть клан. Сначала передайте лидерство."}
        cursor.execute("DELETE FROM clan_members WHERE user_id = ?", (user_id,))
        cursor.execute("UPDATE players SET clan_id = NULL WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return {"ok": True}

    def get_clan_info(self, clan_id: int) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clans WHERE id = ?", (clan_id,))
        clan = cursor.fetchone()
        if not clan:
            conn.close()
            return None
        cursor.execute(
            """SELECT cm.user_id, cm.role, p.username, p.level, p.wins
               FROM clan_members cm JOIN players p ON p.user_id = cm.user_id
               WHERE cm.clan_id = ? ORDER BY cm.role DESC, p.wins DESC""",
            (clan_id,),
        )
        members = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return {"clan": dict(clan), "members": members}

    def search_clans(self, query_str: str, limit: int = 5) -> List[Dict]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """SELECT c.id, c.name, c.tag, c.level, c.wins,
                      (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
               FROM clans c
               WHERE c.name LIKE ? OR c.tag LIKE ?
               ORDER BY c.wins DESC LIMIT ?""",
            (f"%{query_str}%", f"%{query_str}%", limit),
        )
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    # ------------------------------------------------------------------
    # Реферальная система
    # ------------------------------------------------------------------

    def get_referral_code(self, user_id: int) -> str:
        """Вернуть реферальный код игрока; сгенерировать если нет."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT referral_code FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        code = row["referral_code"] if row else None
        if not code:
            code = f"ref_{uuid.uuid4().hex[:10]}"
            cursor.execute(
                "UPDATE players SET referral_code = ? WHERE user_id = ?",
                (code, user_id),
            )
            conn.commit()
        conn.close()
        return code

    def get_referrer_id(self, referred_id: int) -> Optional[int]:
        """Telegram user_id реферера или None."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT referrer_id FROM referrals WHERE referred_id = ?",
            (referred_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return int(row["referrer_id"]) if row else None

    def get_referral_stats(self, user_id: int) -> Dict[str, Any]:
        """Статистика реферальной программы для реферера."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_id = ?",
            (user_id,),
        )
        invited_count = cursor.fetchone()["cnt"]
        cursor.execute(
            """
            SELECT COUNT(*) AS cnt FROM referrals r
            INNER JOIN players p ON p.user_id = r.referred_id
            WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL
            """,
            (user_id,),
        )
        paying_subscribers = cursor.fetchone()["cnt"]
        cursor.execute(
            """
            SELECT COALESCE(SUM(reward_diamonds), 0) AS d,
                   COALESCE(SUM(reward_gold), 0) AS g,
                   COALESCE(SUM(reward_usdt), 0) AS u
            FROM referral_rewards WHERE referrer_id = ?
            """,
            (user_id,),
        )
        rw = cursor.fetchone()
        cursor.execute(
            "SELECT COALESCE(referral_usdt_balance, 0) AS bal, last_withdrawal_at FROM players WHERE user_id = ?",
            (user_id,),
        )
        bal_row = cursor.fetchone()
        conn.close()

        balance = round(float(bal_row["bal"] if bal_row else 0), 4)
        cooldown_hours = 0
        last_wd = bal_row["last_withdrawal_at"] if bal_row else None
        if last_wd:
            try:
                last_dt = datetime.fromisoformat(str(last_wd))
                elapsed = (datetime.utcnow() - last_dt).total_seconds()
                if elapsed < 86400:
                    cooldown_hours = max(1, int((86400 - elapsed) / 3600) + 1)
            except Exception:
                pass

        return {
            "invited_count": invited_count,
            "paying_subscribers": paying_subscribers,
            "total_reward_diamonds": int(rw["d"] or 0),
            "total_reward_gold": int(rw["g"] or 0),
            "total_reward_usdt": round(float(rw["u"] or 0), 4),
            "usdt_balance": balance,
            "can_withdraw": balance >= 5.0 and cooldown_hours == 0,
            "cooldown_hours": cooldown_hours,
        }

    def get_recent_referrals(self, referrer_id: int, limit: int = 3) -> List[Dict[str, Any]]:
        """Последние приглашённые по дате записи (для экрана рефералки)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT r.referred_id, p.username
            FROM referrals r
            INNER JOIN players p ON p.user_id = r.referred_id
            WHERE r.referrer_id = ?
            ORDER BY r.created_at DESC
            LIMIT ?
            """,
            (referrer_id, int(limit)),
        )
        rows = cursor.fetchall()
        conn.close()
        return [
            {"referred_id": int(row["referred_id"]), "username": (row["username"] or "").strip()}
            for row in rows
        ]

    def process_referral_first_premium(self, buyer_id: int, stars_paid: int) -> Dict[str, Any]:
        """
        Первая оплата подписки Premium (Stars). Начисляет рефереру % по рангу N, выставляет tier early/vip.
        Повторный вызов при уже оплаченной подписке — не начисляет (вернёт renewal).
        """
        from config import (
            REFERRAL_PCT_SUB_RANK_1_10,
            REFERRAL_PCT_SUB_RANK_11_30,
            REFERRAL_PCT_SUB_RANK_31_PLUS,
        )

        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT first_premium_at FROM players WHERE user_id = ?",
                (buyer_id,),
            )
            row = cursor.fetchone()
            if row and row["first_premium_at"]:
                cursor.execute(
                    "UPDATE players SET is_premium = 1 WHERE user_id = ?",
                    (buyer_id,),
                )
            else:
                now = datetime.utcnow().isoformat()
                cursor.execute(
                    "UPDATE players SET is_premium = 1, first_premium_at = ? WHERE user_id = ?",
                    (now, buyer_id),
                )
            conn.commit()
            conn.close()
            out["ok"] = True
            out["no_referrer"] = True
            out["renewal"] = bool(row and row["first_premium_at"])
            return out

        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT first_premium_at, referral_tier FROM players WHERE user_id = ?",
                (buyer_id,),
            )
            row = cursor.fetchone()
            if not row:
                return out
            if row["first_premium_at"]:
                cursor.execute(
                    "UPDATE players SET is_premium = 1 WHERE user_id = ?",
                    (buyer_id,),
                )
                conn.commit()
                out["ok"] = True
                out["renewal"] = True
                return out

            cursor.execute(
                """
                SELECT COUNT(*) AS c FROM referrals r
                INNER JOIN players p ON p.user_id = r.referred_id
                WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL
                """,
                (referrer_id,),
            )
            rank = int(cursor.fetchone()["c"]) + 1
            if rank <= 10:
                pct = REFERRAL_PCT_SUB_RANK_1_10
            elif rank <= 30:
                pct = REFERRAL_PCT_SUB_RANK_11_30
            else:
                pct = REFERRAL_PCT_SUB_RANK_31_PLUS
            tier = "vip" if rank >= 31 else "early"
            reward_d = int(stars_paid * pct / 100)
            now = datetime.utcnow().isoformat()
            cursor.execute(
                """
                UPDATE players SET
                    first_premium_at = ?,
                    referral_subscriber_rank = ?,
                    referral_tier = ?,
                    is_premium = 1
                WHERE user_id = ?
                """,
                (now, rank, tier, buyer_id),
            )
            if reward_d > 0:
                cursor.execute(
                    "UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?",
                    (reward_d, referrer_id),
                )
            cursor.execute(
                """
                INSERT INTO referral_rewards
                (referrer_id, buyer_id, reward_type, percent, base_stars, reward_diamonds)
                VALUES (?, ?, 'first_premium', ?, ?, ?)
                """,
                (referrer_id, buyer_id, pct, stars_paid, reward_d),
            )
            conn.commit()
            out["ok"] = True
            out["referrer_id"] = referrer_id
            out["reward_diamonds"] = reward_d
            out["rank"] = rank
            out["percent"] = pct
            return out
        finally:
            conn.close()

    def process_referral_vip_shop_purchase(
        self,
        buyer_id: int,
        *,
        stars: int = 0,
        gold: int = 0,
        diamonds: int = 0,
    ) -> Dict[str, Any]:
        """10% рефереру только если у приглашённого referral_tier = vip (31+ по первой подписке)."""
        from config import REFERRAL_PCT_VIP_ALL_SHOP

        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id or (stars <= 0 and gold <= 0 and diamonds <= 0):
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT referral_tier FROM players WHERE user_id = ?",
            (buyer_id,),
        )
        row = cursor.fetchone()
        if not row or row["referral_tier"] != "vip":
            conn.close()
            return out
        pct = REFERRAL_PCT_VIP_ALL_SHOP
        reward_d = int(stars * pct / 100) + int(diamonds * pct / 100)
        reward_g = int(gold * pct / 100)
        try:
            if reward_d > 0:
                cursor.execute(
                    "UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?",
                    (reward_d, referrer_id),
                )
            if reward_g > 0:
                cursor.execute(
                    "UPDATE players SET gold = gold + ? WHERE user_id = ?",
                    (reward_g, referrer_id),
                )
            if reward_d > 0 or reward_g > 0:
                cursor.execute(
                    """
                    INSERT INTO referral_rewards
                    (referrer_id, buyer_id, reward_type, percent, base_stars, base_gold, base_diamonds,
                     reward_diamonds, reward_gold)
                    VALUES (?, ?, 'vip_shop', ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        referrer_id,
                        buyer_id,
                        pct,
                        stars,
                        gold,
                        diamonds,
                        reward_d,
                        reward_g,
                    ),
                )
            conn.commit()
            out["ok"] = True
            out["referrer_id"] = referrer_id
            out["reward_diamonds"] = reward_d
            out["reward_gold"] = reward_g
            return out
        finally:
            conn.close()

    def process_referral_crypto_premium(self, buyer_id: int, usdt_paid: float) -> Dict[str, Any]:
        """Начислить USDT рефереру при первой покупке Premium через CryptoPay USDT."""
        from config import (
            REFERRAL_PCT_SUB_RANK_1_10,
            REFERRAL_PCT_SUB_RANK_11_30,
            REFERRAL_PCT_SUB_RANK_31_PLUS,
        )
        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            return out
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT first_premium_at FROM players WHERE user_id = ?",
                (buyer_id,),
            )
            row = cursor.fetchone()
            # Только первая покупка — повтор не вознаграждается
            if row and row["first_premium_at"]:
                return out
            cursor.execute(
                """
                SELECT COUNT(*) AS c FROM referrals r
                INNER JOIN players p ON p.user_id = r.referred_id
                WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL
                """,
                (referrer_id,),
            )
            rank = int(cursor.fetchone()["c"]) + 1
            if rank <= 10:
                pct = REFERRAL_PCT_SUB_RANK_1_10
            elif rank <= 30:
                pct = REFERRAL_PCT_SUB_RANK_11_30
            else:
                pct = REFERRAL_PCT_SUB_RANK_31_PLUS
            reward_usdt = round(usdt_paid * pct / 100, 4)
            if reward_usdt > 0:
                cursor.execute(
                    "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + ? WHERE user_id = ?",
                    (reward_usdt, referrer_id),
                )
            cursor.execute(
                """
                INSERT INTO referral_rewards
                (referrer_id, buyer_id, reward_type, percent, reward_usdt)
                VALUES (?, ?, 'crypto_premium', ?, ?)
                """,
                (referrer_id, buyer_id, pct, reward_usdt),
            )
            conn.commit()
            out["ok"] = True
            out["referrer_id"] = referrer_id
            out["reward_usdt"] = reward_usdt
            out["rank"] = rank
            out["percent"] = pct
            return out
        finally:
            conn.close()

    WITHDRAW_MIN_USDT  = 5.0    # минимум $5
    WITHDRAW_COOLDOWN  = 86400  # 24 часа в секундах

    def request_referral_withdrawal(self, user_id: int) -> Dict[str, Any]:
        """Проверить возможность вывода USDT. Минимум $5, раз в 24ч.
        Не списывает баланс — это делает confirm_referral_withdrawal после успешного Transfer."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT COALESCE(referral_usdt_balance, 0) AS bal, username, last_withdrawal_at FROM players WHERE user_id = ?",
                (user_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "Игрок не найден"}
            balance = round(float(row["bal"]), 4)
            if balance < self.WITHDRAW_MIN_USDT:
                return {
                    "ok": False,
                    "reason": f"Минимум для вывода: ${self.WITHDRAW_MIN_USDT:.0f} USDT (у вас ${balance:.2f})",
                    "balance": balance,
                }
            # Проверка cooldown 24ч
            if row["last_withdrawal_at"]:
                try:
                    last_dt  = datetime.fromisoformat(str(row["last_withdrawal_at"]))
                    elapsed  = (datetime.utcnow() - last_dt).total_seconds()
                    if elapsed < self.WITHDRAW_COOLDOWN:
                        remaining_h = max(1, int((self.WITHDRAW_COOLDOWN - elapsed) / 3600) + 1)
                        return {
                            "ok": False,
                            "reason": f"Следующий вывод через {remaining_h}ч (раз в сутки)",
                            "cooldown_hours": remaining_h,
                        }
                except Exception:
                    pass
            return {"ok": True, "amount": balance, "username": row["username"] or ""}
        finally:
            conn.close()

    def confirm_referral_withdrawal(self, user_id: int, amount: float) -> Dict[str, Any]:
        """Зафиксировать успешный вывод: списать баланс, записать в историю, обновить cooldown."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            now = datetime.utcnow().isoformat()
            cursor.execute(
                """UPDATE players
                   SET referral_usdt_balance = MAX(0, COALESCE(referral_usdt_balance,0) - ?),
                       last_withdrawal_at = ?
                   WHERE user_id = ?""",
                (amount, now, user_id),
            )
            cursor.execute(
                """INSERT INTO referral_withdrawals (user_id, amount, status, processed_at)
                   VALUES (?, ?, 'completed', ?)""",
                (user_id, amount, now),
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def process_referral_stars_premium(self, buyer_id: int, stars_paid: int) -> Dict[str, Any]:
        """Начислить USDT рефереру при покупке Premium через Telegram Stars.
        1 Star = $0.013 нетто. Только за первую покупку, % зависит от ранга."""
        from config import (
            REFERRAL_PCT_SUB_RANK_1_10,
            REFERRAL_PCT_SUB_RANK_11_30,
            REFERRAL_PCT_SUB_RANK_31_PLUS,
        )
        STAR_TO_USDT = 0.013

        referrer_id = self.get_referrer_id(buyer_id)
        out: Dict[str, Any] = {"ok": False}
        if not referrer_id:
            return out

        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT first_premium_at FROM players WHERE user_id = ?",
                (buyer_id,),
            )
            row = cursor.fetchone()
            # Только за первую покупку
            if row and row["first_premium_at"]:
                return out

            cursor.execute(
                """
                SELECT COUNT(*) AS c FROM referrals r
                INNER JOIN players p ON p.user_id = r.referred_id
                WHERE r.referrer_id = ? AND p.first_premium_at IS NOT NULL
                """,
                (referrer_id,),
            )
            rank = int(cursor.fetchone()["c"]) + 1
            if rank <= 10:
                pct = REFERRAL_PCT_SUB_RANK_1_10
            elif rank <= 30:
                pct = REFERRAL_PCT_SUB_RANK_11_30
            else:
                pct = REFERRAL_PCT_SUB_RANK_31_PLUS

            tier = "vip" if rank >= 31 else "early"
            usdt_base   = round(stars_paid * STAR_TO_USDT, 4)
            reward_usdt = round(usdt_base * pct / 100, 4)
            now = datetime.utcnow().isoformat()

            # Обновить данные покупателя
            cursor.execute(
                """UPDATE players SET first_premium_at = ?,
                   referral_subscriber_rank = ?, referral_tier = ?
                   WHERE user_id = ?""",
                (now, rank, tier, buyer_id),
            )
            # Начислить реферу
            if reward_usdt > 0:
                cursor.execute(
                    "UPDATE players SET referral_usdt_balance = COALESCE(referral_usdt_balance,0) + ? WHERE user_id = ?",
                    (reward_usdt, referrer_id),
                )
            cursor.execute(
                """INSERT INTO referral_rewards
                   (referrer_id, buyer_id, reward_type, percent, base_stars, reward_usdt)
                   VALUES (?, ?, 'stars_premium', ?, ?, ?)""",
                (referrer_id, buyer_id, pct, stars_paid, reward_usdt),
            )
            conn.commit()
            out["ok"]          = True
            out["referrer_id"] = referrer_id
            out["reward_usdt"] = reward_usdt
            out["rank"]        = rank
            out["percent"]     = pct
            return out
        finally:
            conn.close()

    def transfer_clan_leader(self, leader_id: int, new_leader_id: int) -> Dict[str, Any]:
        """Передать роль лидера клана другому участнику."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM clans WHERE leader_id = ?", (leader_id,))
            clan_row = cursor.fetchone()
            if not clan_row:
                return {"ok": False, "reason": "Вы не являетесь лидером клана"}
            clan_id = clan_row["id"]
            if new_leader_id == leader_id:
                return {"ok": False, "reason": "Вы уже являетесь лидером"}
            cursor.execute(
                "SELECT user_id FROM clan_members WHERE user_id = ? AND clan_id = ?",
                (new_leader_id, clan_id),
            )
            if not cursor.fetchone():
                return {"ok": False, "reason": "Игрок не является участником вашего клана"}
            cursor.execute("UPDATE clans SET leader_id = ? WHERE id = ?", (new_leader_id, clan_id))
            cursor.execute(
                "UPDATE clan_members SET role = 'leader' WHERE user_id = ? AND clan_id = ?",
                (new_leader_id, clan_id),
            )
            cursor.execute(
                "UPDATE clan_members SET role = 'member' WHERE user_id = ? AND clan_id = ?",
                (leader_id, clan_id),
            )
            conn.commit()
            return {"ok": True}
        finally:
            conn.close()

    def get_player_chat_id(self, user_id: int) -> Optional[int]:
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT chat_id FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        if row and row["chat_id"] is not None:
            return int(row["chat_id"])
        return None

    def register_referral(self, new_user_id: int, referral_code: str) -> Tuple[bool, Optional[int]]:
        """
        Привязать нового игрока к рефереру по коду (один раз на user_id — первый успешный ref).
        Возвращает (True, referrer_user_id) при успехе, (False, None) иначе.
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id FROM players WHERE referral_code = ?",
                (referral_code,),
            )
            referrer_row = cursor.fetchone()
            if not referrer_row:
                return False, None
            referrer_id = referrer_row["user_id"]
            if referrer_id == new_user_id:
                return False, None
            cursor.execute(
                "SELECT referred_by FROM players WHERE user_id = ?",
                (new_user_id,),
            )
            rb = cursor.fetchone()
            if rb and rb["referred_by"]:
                return False, None
            # Проверяем: новый игрок уже кем-то приглашён?
            cursor.execute(
                "SELECT 1 FROM referrals WHERE referred_id = ?",
                (new_user_id,),
            )
            if cursor.fetchone():
                return False, None
            cursor.execute(
                "INSERT OR IGNORE INTO referrals (referral_code, referrer_id, referred_id) VALUES (?, ?, ?)",
                (referral_code, referrer_id, new_user_id),
            )
            cursor.execute(
                "UPDATE players SET referred_by = ? WHERE user_id = ?",
                (referral_code, new_user_id),
            )
            conn.commit()
            return True, int(referrer_id)
        finally:
            conn.close()

    # ─── Premium подписка ────────────────────────────────────────────────────

    def get_premium_status(self, user_id: int) -> Dict[str, Any]:
        """Вернуть статус Premium: is_active, days_left, premium_until."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT premium_until FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            if not row or not row["premium_until"]:
                return {"is_active": False, "days_left": 0, "premium_until": None}
            from datetime import datetime
            try:
                until = datetime.fromisoformat(row["premium_until"])
                now   = datetime.utcnow()
                if until <= now:
                    return {"is_active": False, "days_left": 0, "premium_until": row["premium_until"]}
                days_left = max(0, (until - now).days)
                return {"is_active": True, "days_left": days_left, "premium_until": row["premium_until"]}
            except Exception:
                return {"is_active": False, "days_left": 0, "premium_until": None}
        finally:
            conn.close()

    def activate_premium(self, user_id: int, days: int = 21) -> Dict[str, Any]:
        """
        Активировать Premium на N дней.
        Если уже активна — продлить от текущей даты окончания.
        Возвращает {"ok": True, "premium_until": "...", "days_left": N}
        """
        from datetime import datetime, timedelta
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT premium_until FROM players WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()
            now = datetime.utcnow()

            # Если подписка ещё активна — продлеваем от конца текущего периода
            current_until = None
            if row and row["premium_until"]:
                try:
                    current_until = datetime.fromisoformat(row["premium_until"])
                except Exception:
                    current_until = None

            base = current_until if (current_until and current_until > now) else now
            new_until = base + timedelta(days=days)
            new_until_str = new_until.isoformat()

            # Активируем Premium + начисляем 1000 алмазов как бонус при покупке
            is_renewal = bool(current_until and current_until > now)
            bonus_diamonds = 0 if is_renewal else 1000
            cursor.execute(
                "UPDATE players SET premium_until = ?, diamonds = diamonds + ? WHERE user_id = ?",
                (new_until_str, bonus_diamonds, user_id),
            )
            conn.commit()
            days_left = max(0, (new_until - now).days)
            return {
                "ok": True, "premium_until": new_until_str,
                "days_left": days_left, "bonus_diamonds": bonus_diamonds,
            }
        finally:
            conn.close()

    # ─── Telegram Stars оплаты ───────────────────────────────────────────────

    def confirm_stars_payment(
        self, user_id: int, package_id: str, diamonds: int, stars: int
    ) -> Dict[str, Any]:
        """
        Атомарно начислить алмазы за Stars-покупку.
        Идемпотентность: не более 1 начисления одного package_id за последние 5 минут.
        Возвращает {"ok": True, "diamonds": N} или {"ok": False, "reason": ...}
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            # Проверяем: не было ли начисления этого пакета за последние 5 минут
            cursor.execute(
                """SELECT id FROM stars_payments
                   WHERE user_id = ? AND package_id = ?
                     AND created_at > datetime('now', '-5 minutes')""",
                (user_id, package_id),
            )
            if cursor.fetchone():
                return {"ok": False, "reason": "already_credited"}

            # Начислить алмазы
            if diamonds > 0:
                cursor.execute(
                    "UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?",
                    (diamonds, user_id),
                )
            # Записать факт оплаты
            cursor.execute(
                """INSERT INTO stars_payments (user_id, package_id, diamonds, stars, source)
                   VALUES (?, ?, ?, ?, 'tma')""",
                (user_id, package_id, diamonds, stars),
            )
            conn.commit()
            return {"ok": True, "diamonds": diamonds}
        finally:
            conn.close()

    # ─── CryptoPay инвойсы ────────────────────────────────────────────────────

    def create_crypto_invoice(
        self,
        user_id: int,
        invoice_id: int,
        diamonds: int,
        asset: str,
        amount: str,
    ) -> None:
        """Сохранить новый CryptoPay инвойс в БД (статус pending)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """INSERT OR IGNORE INTO crypto_invoices
                   (invoice_id, user_id, diamonds, asset, amount, status)
                   VALUES (?, ?, ?, ?, ?, 'pending')""",
                (invoice_id, user_id, diamonds, asset.upper(), amount),
            )
            conn.commit()
        finally:
            conn.close()

    def confirm_crypto_invoice(self, invoice_id: int) -> Dict[str, Any]:
        """
        Подтвердить оплату CryptoPay инвойса.
        Атомарно: только один раз (WHERE status='pending') → начислить алмазы.
        Возвращает {"ok": True, "user_id": ..., "diamonds": ...} или {"ok": False, "reason": ...}
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT user_id, diamonds, asset, amount, status FROM crypto_invoices WHERE invoice_id = ?",
                (invoice_id,),
            )
            row = cursor.fetchone()
            if not row:
                return {"ok": False, "reason": "invoice_not_found"}
            if row["status"] == "paid":
                return {"ok": False, "reason": "already_paid"}
            if row["status"] != "pending":
                return {"ok": False, "reason": f"wrong_status:{row['status']}"}

            user_id  = int(row["user_id"])
            diamonds = int(row["diamonds"])
            asset    = str(row["asset"] or "TON")
            amount   = str(row["amount"] or "0")

            # Атомарно обновляем статус (второй параллельный вызов не пройдёт)
            cursor.execute(
                """UPDATE crypto_invoices
                   SET status = 'paid', paid_at = CURRENT_TIMESTAMP
                   WHERE invoice_id = ? AND status = 'pending'""",
                (invoice_id,),
            )
            if cursor.rowcount == 0:
                conn.commit()
                return {"ok": False, "reason": "already_paid"}

            # Начислить алмазы
            cursor.execute(
                "UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?",
                (diamonds, user_id),
            )
            conn.commit()
            return {"ok": True, "user_id": user_id, "diamonds": diamonds, "asset": asset, "amount": amount}
        finally:
            conn.close()

    def get_pending_crypto_invoices_older_than(self, seconds: int) -> List[Dict]:
        """Вернуть pending-инвойсы старше N секунд (для polling проверки)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT invoice_id, user_id, diamonds, asset, amount, created_at
                   FROM crypto_invoices
                   WHERE status = 'pending'
                     AND created_at < datetime('now', ? || ' seconds')
                   ORDER BY created_at ASC LIMIT 50""",
                (f"-{seconds}",),
            )
            rows = [dict(r) for r in cursor.fetchall()]
            return rows
        finally:
            conn.close()


    # ─── Клановый чат ────────────────────────────────────────────────────────

    def send_clan_message(self, clan_id: int, user_id: int, username: str, message: str) -> bool:
        """Отправить сообщение в клановый чат. Возвращает True при успехе."""
        message = (message or "").strip()[:200]
        if not message:
            return False
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT 1 FROM clan_members WHERE user_id = ? AND clan_id = ?",
                (user_id, clan_id),
            )
            if not cursor.fetchone():
                return False
            cursor.execute(
                "INSERT INTO clan_messages (clan_id, user_id, username, message) VALUES (?, ?, ?, ?)",
                (clan_id, user_id, username, message),
            )
            conn.commit()
            return True
        finally:
            conn.close()

    def get_clan_messages(self, clan_id: int, limit: int = 40) -> List[Dict[str, Any]]:
        """Вернуть последние N сообщений чата клана (от старых к новым)."""
        conn = self.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """SELECT id, user_id, username, message,
                          strftime('%H:%M', created_at) AS time_str
                   FROM clan_messages WHERE clan_id = ?
                   ORDER BY created_at DESC LIMIT ?""",
                (clan_id, int(limit)),
            )
            rows = cursor.fetchall()
            return [dict(r) for r in reversed(rows)]
        finally:
            conn.close()


# Глобальный экземпляр базы данных
db = Database()
