"""SQLite migrations chunk 12 — снос старого armor под корень.

Удаляет ВСЕ данные старого слота `armor`:
- DROP TABLE player_owned_armor (купленные мифик-брони)
- DROP TABLE armor_custom_mods (USDT-кастомка armor_mythic4 +19 статов)
- DELETE FROM player_equipment WHERE slot='armor' (надетая броня)
- DELETE FROM equipment_rentals WHERE item_id LIKE 'armor%' (аренды брони)
- UPDATE players SET current_class=NULL, current_class_type=NULL (legacy-кэш)

Это финальный snос старого armor — новый чистый слот «БРОНЯ» строится с нуля.
"""
from __future__ import annotations


MIGRATIONS_PART12_ARMOR_WIPE = [
    ("2026_05_19_001_armor_wipe_owned", [
        "DROP TABLE IF EXISTS player_owned_armor",
    ]),
    ("2026_05_19_002_armor_wipe_custom_mods", [
        "DROP TABLE IF EXISTS armor_custom_mods",
    ]),
    ("2026_05_19_003_armor_wipe_equipment_slot", [
        "DELETE FROM player_equipment WHERE slot = 'armor'",
    ]),
    ("2026_05_19_004_armor_wipe_rentals", [
        "DELETE FROM equipment_rentals WHERE item_id LIKE 'armor%'",
    ]),
    ("2026_05_19_005_armor_wipe_current_class", [
        "UPDATE players SET current_class = NULL, current_class_type = NULL",
    ]),
]
