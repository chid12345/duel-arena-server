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
]
