"""Нормализация SQL SQLite → PostgreSQL."""

from __future__ import annotations

import re
from typing import List, Tuple


def _norm_sql(sql: str) -> str:
    return " ".join(sql.split())


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
        "INSERT OR IGNORE INTO season_stats (season_id, user_id) VALUES (?, ?)",
        "INSERT INTO season_stats (season_id, user_id) VALUES (%s, %s) ON CONFLICT (season_id, user_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO battle_pass (user_id, season_id) VALUES (?, ?)",
        "INSERT INTO battle_pass (user_id, season_id) VALUES (%s, %s) ON CONFLICT (user_id, season_id) DO NOTHING",
    ),
    (
        "INSERT OR IGNORE INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status, payload) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
        "INSERT INTO crypto_invoices (invoice_id, user_id, diamonds, asset, amount, status, payload) VALUES (%s, %s, %s, %s, %s, 'pending', %s) ON CONFLICT (invoice_id) DO NOTHING",
    ),
    (
        "INSERT OR REPLACE INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (?, ?, ?, ?)",
        "INSERT INTO pvp_queue (user_id, level, chat_id, message_id) VALUES (%s, %s, %s, %s) "
        "ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, chat_id = EXCLUDED.chat_id, message_id = EXCLUDED.message_id",
    ),
    (
        "INSERT OR IGNORE INTO endless_attempts (user_id, attempt_date, attempts_used, extra_gold, extra_diamond) VALUES (?,?,0,0,0)",
        "INSERT INTO endless_attempts (user_id, attempt_date, attempts_used, extra_gold, extra_diamond) VALUES (%s, %s, 0, 0, 0) ON CONFLICT (user_id, attempt_date) DO NOTHING",
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
    # MAX/MIN с 2+ аргументами → GREATEST/LEAST (выражения вида MAX(0, col - ?)).
    # Агрегатный MAX(col) без запятой — не трогаем.
    s = re.sub(r'\bMAX\s*\(([^)]+,[^)]+)\)', r'GREATEST(\1)', s)
    s = re.sub(r'\bMIN\s*\(([^)]+,[^)]+)\)', r'LEAST(\1)', s)
    s = re.sub(r'\breward_claimed\s*=\s*1\b', 'reward_claimed = TRUE', s)
    s = re.sub(r'\breward_claimed\s*=\s*0\b', 'reward_claimed = FALSE', s)
    s = re.sub(r'\bis_bot2\s*=\s*1\b', 'is_bot2 = TRUE', s)
    s = re.sub(r'\bis_bot2\s*=\s*0\b', 'is_bot2 = FALSE', s)
    s = re.sub(r'\bis_bot1\s*=\s*1\b', 'is_bot1 = TRUE', s)
    s = re.sub(r'\bis_bot1\s*=\s*0\b', 'is_bot1 = FALSE', s)
    s = re.sub(r'\bis_premium\s*=\s*1\b', 'is_premium = TRUE', s)
    s = re.sub(r'\bis_premium\s*=\s*0\b', 'is_premium = FALSE', s)
    s = re.sub(r'\bclaimed\s*=\s*1\b', 'claimed = TRUE', s)
    s = re.sub(r'\bclaimed\s*=\s*0\b', 'claimed = FALSE', s)
    s = re.sub(r'\bis_active\s*=\s*1\b', 'is_active = TRUE', s)
    s = re.sub(r'\bis_active\s*=\s*0\b', 'is_active = FALSE', s)
    s = re.sub(r'\bis_active\s+INTEGER\s+DEFAULT\s+0\b', 'is_active BOOLEAN DEFAULT FALSE', s)
    s = re.sub(r'\bis_active\s+INTEGER\s+DEFAULT\s+1\b', 'is_active BOOLEAN DEFAULT TRUE', s)
    # Конвертировать integer-литерал TRUE/FALSE в VALUES когда is_active идёт через параметр %s
    # Дополнительная защита: is_active BOOLEAN, reward_claimed BOOLEAN не принимают int-литерал
    s = re.sub(r'\breward_claimed\s+INTEGER\s+DEFAULT\s+0\b', 'reward_claimed BOOLEAN DEFAULT FALSE', s)
    s = re.sub(r'\bclaimed\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0\b', 'claimed BOOLEAN NOT NULL DEFAULT FALSE', s)
    s = s.replace("?", "%s")
    s = s.replace("__PG_INTERVAL_SEC__", "(NOW() + (%s::text || ' seconds')::interval)")
    return s
