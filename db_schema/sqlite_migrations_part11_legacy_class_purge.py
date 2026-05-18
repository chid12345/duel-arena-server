"""SQLite migrations chunk 11 — снос legacy class-системы.

Удаляет таблицу user_inventory (после переноса USDT-кастомки в armor_custom_mods,
а владения мифик-бронёй в player_owned_armor — это сделано миграциями part10).

Колонки players.current_class и current_class_type оставляем — теперь они
кэш для battle-перков, автоматически синхронизируются через equip_item('armor').

SQLite не поддерживает ALTER DROP COLUMN до 3.35; полагаемся на то что новые
колонки strength_saved/etc уже не пишутся (legacy функции удалены).
"""
from __future__ import annotations


MIGRATIONS_PART11_LEGACY_PURGE = [
    ("2026_05_19_001_drop_user_inventory", [
        "DROP TABLE IF EXISTS user_inventory",
    ]),
]
