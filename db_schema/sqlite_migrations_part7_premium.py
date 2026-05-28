"""SQLite migrations chunk 7 — премиум-фичи (Этап 7C редизайна).

Этап 7C: кнопка «Удвоить следующий бой» — один раз в день для премов.
- next_battle_x2: 1 = следующий бой удвоит награду (gold+xp)
- next_battle_x2_date: дата последней активации (YYYY-MM-DD), чтобы лимит «1/день»
"""
from __future__ import annotations

MIGRATIONS_PART7_PREMIUM = [
    ("2026_05_16_010_next_battle_x2", [
        "ALTER TABLE players ADD COLUMN next_battle_x2 INTEGER DEFAULT 0",
        "ALTER TABLE players ADD COLUMN next_battle_x2_date TEXT DEFAULT ''",
    ]),
    # Паритет с Postgres (ddl_01): players.is_premium есть в проде, но в SQLite
    # был только на inventory → реферальная премиум-обработка
    # (process_referral_crypto_premium пишет players.is_premium) падала в тестах
    # «no such column». Добавляем флаг и в SQLite-схему.
    ("2026_05_28_001_players_is_premium", [
        "ALTER TABLE players ADD COLUMN is_premium BOOLEAN DEFAULT 0",
    ]),
    # Дедупликация реферальных наград при бэкафилле — один инвойс = одна выплата.
    ("2026_05_28_002_referral_rewards_invoice_id", [
        "ALTER TABLE referral_rewards ADD COLUMN invoice_id INTEGER",
        "CREATE INDEX IF NOT EXISTS idx_referral_rewards_invoice ON referral_rewards (invoice_id)",
    ]),
]
