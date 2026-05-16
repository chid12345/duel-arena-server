"""SQLite migrations chunk 9 — warrior_type у ботов (Этап 9 завершение).

Чтобы боты в карточке боя выглядели как живые игроки (3D-модель класса воина:
tank/agile/crit с 3 вариантами в каждом), таблица bots получает поле
warrior_type. Генератор `_generate_bot_data` назначает случайный из 9 классов
(tank_0..crit_2). Default-варианта для ботов нет — все боты имеют реальный класс.
"""
from __future__ import annotations

MIGRATIONS_PART9_BOTS_WARRIOR = [
    ("2026_05_17_010_bots_warrior_type", [
        "ALTER TABLE bots ADD COLUMN warrior_type TEXT DEFAULT 'tank_0'",
    ]),
]
