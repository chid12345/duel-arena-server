"""SQLite migrations chunk 8 — аренда mythic-снаряжения (Этап 8 редизайна).

Аренда — альтернатива покупке: дешевле, но временно. Истёкшие аренды
снимаются при попытке экипировать или при ежедневной чистке.

Структура: одна запись на (user_id, item_id). Если арендовал повторно —
expires_at продлевается. UPSERT — в repositories/rentals/rental_repo.py.
"""
from __future__ import annotations

MIGRATIONS_PART8_RENTALS = [
    ("2026_05_17_001_equipment_rentals", [
        """CREATE TABLE IF NOT EXISTS equipment_rentals (
            user_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            rented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            stars_paid INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, item_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_equipment_rentals_user ON equipment_rentals (user_id)",
        "CREATE INDEX IF NOT EXISTS idx_equipment_rentals_expires ON equipment_rentals (expires_at)",
    ]),
]
