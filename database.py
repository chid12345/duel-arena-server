"""
База данных Duel Arena
SQLite база для хранения игроков, боев, ботов
"""

import sqlite3
import random
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from config import *


class Database:
    """Класс для работы с базой данных"""
    
    def __init__(self):
        self.db_name = DB_NAME
        self.init_database()
    
    def get_connection(self):
        """Получить соединение с базой данных"""
        conn = sqlite3.connect(self.db_name, timeout=15)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        """Инициализация всех таблиц"""
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

    def rebalance_all_bots(self) -> None:
        """Пересчитать статы всех ботов по кривой уровня (после обновления баланса)."""
        conn = self.get_connection()
        cursor = conn.cursor()
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
            conn.commit()
        finally:
            conn.close()

    def create_initial_bots(self):
        """
        Дополнить популяцию по таблице BOT_COUNT_BY_LEVEL, затем до TARGET_BOT_POPULATION
        (доп. боты с уровнями 11+ — см. BOT_EXTRA_POPULATION_ABOVE_10).
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        batch_commit_every = 80
        inserted = 0
        try:
            for level, want in sorted(BOT_COUNT_BY_LEVEL.items()):
                cursor.execute("SELECT COUNT(*) FROM bots WHERE level = ?", (level,))
                have = int(cursor.fetchone()[0])
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

            cursor.execute("SELECT COUNT(*) FROM bots")
            total = int(cursor.fetchone()[0])
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
        
        cursor.execute('''
            INSERT INTO battles 
            (player1_id, player2_id, is_bot1, is_bot2, winner_id, battle_result, 
             rounds_played, battle_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            battle_data['player1_id'],
            battle_data['player2_id'],
            battle_data['is_bot1'],
            battle_data['is_bot2'],
            battle_data['winner_id'],
            battle_data['result'],
            battle_data['rounds'],
            str(battle_data['details'])
        ))
        
        battle_id = cursor.lastrowid
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

    def wipe_player_profile(self, user_id: int) -> None:
        """Удалить игрока и связанные строки; при следующем /start создастся новый профиль."""
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
        
        streak, last_daily = result
        
        if last_daily:
            last_date = datetime.strptime(last_daily, '%Y-%m-%d').date()
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
            improvements[row[0]] = row[1]
        
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
        if not result or result[0] >= IMPROVEMENT_LEVELS:
            conn.close()
            return False
        
        current_level = result[0]
        new_level = current_level + 1
        
        # Рассчитываем стоимость
        base_cost = self._get_improvement_cost(improvement_type, new_level)
        
        # Проверяем золото
        cursor.execute('SELECT gold FROM players WHERE user_id = ?', (user_id,))
        player_gold = cursor.fetchone()[0]
        
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
        cursor.execute(
            "INSERT INTO seasons (name, status) VALUES (?, 'active')",
            (new_season_name,),
        )
        new_sid = cursor.lastrowid
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
            cursor.execute(
                "INSERT INTO clans (name, tag, leader_id) VALUES (?, ?, ?)",
                (name, tag, leader_id),
            )
            clan_id = cursor.lastrowid
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
            SELECT COALESCE(SUM(reward_diamonds), 0) AS d, COALESCE(SUM(reward_gold), 0) AS g
            FROM referral_rewards WHERE referrer_id = ?
            """,
            (user_id,),
        )
        rw = cursor.fetchone()
        conn.close()
        return {
            "invited_count": invited_count,
            "paying_subscribers": paying_subscribers,
            "total_reward_diamonds": int(rw["d"] or 0),
            "total_reward_gold": int(rw["g"] or 0),
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


# Глобальный экземпляр базы данных
db = Database()
