"""SQLite migrations chunk 13 — новый чистый armor2 после сноса старого armor.

Создаёт две таблицы:
- player_owned_armor2 — что куплено (аналог player_owned_weapons, одна таблица
  для всех 16 предметов armor2_free1..armor2_mythic4).
- armor2_custom_mods — персональные модификаторы ТОЛЬКО для armor2_mythic4
  (Легендарная USDT-броня +19 свободных статов + выбор пассивки).

В отличие от старой armor — никакой синхронизации с players.current_class,
никакого _mirror_armor_to_unified_tables, никакого legacy class-mapping.
Чистая реализация по образцу helmet/weapon/shield/boots/ring.
"""
from __future__ import annotations


MIGRATIONS_PART13_ARMOR2 = [
    ("2026_05_19_010_player_owned_armor2", [
        """CREATE TABLE IF NOT EXISTS player_owned_armor2 (
            user_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            owned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, item_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_player_owned_armor2_user ON player_owned_armor2 (user_id)",
    ]),
    ("2026_05_19_011_armor2_custom_mods", [
        """CREATE TABLE IF NOT EXISTS armor2_custom_mods (
            user_id INTEGER NOT NULL,
            item_id TEXT NOT NULL,
            str_bonus INTEGER NOT NULL DEFAULT 0,
            agi_bonus INTEGER NOT NULL DEFAULT 0,
            int_bonus INTEGER NOT NULL DEFAULT 0,
            end_bonus INTEGER NOT NULL DEFAULT 0,
            custom_name TEXT,
            applied INTEGER NOT NULL DEFAULT 0,
            free_stats_left INTEGER NOT NULL DEFAULT 19,
            passive_type TEXT,
            PRIMARY KEY (user_id, item_id)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_armor2_custom_mods_user ON armor2_custom_mods (user_id)",
    ]),
    # 2026_05_20: КОНЕЦ ДУАЛИЗМА. Броня жила в отдельной таблице player_owned_armor2 —
    # из-за этого каждая операция «для всех предметов» (сброс/выдача/проверка) про
    # неё забывала → повторяющиеся баги. Сливаем броню в общую player_owned_weapons
    # (id не конфликтуют: armor2_* vs weapon_*/helmet_*/…). Теперь броня «как все 5
    # слотов». armor2_custom_mods (+19 статов легендарной) остаётся — это спец-поля
    # одного предмета. Движок миграций толерантен к ошибкам statement (skip+log),
    # поэтому повторный запуск после DROP безопасен.
    ("2026_05_20_001_merge_owned_armor2_into_weapons", [
        "INSERT INTO player_owned_weapons (user_id, item_id) "
        "SELECT user_id, item_id FROM player_owned_armor2 ON CONFLICT DO NOTHING",
        "DROP TABLE IF EXISTS player_owned_armor2",
    ]),
]
