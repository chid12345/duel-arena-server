"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.41"
VERSION_LABEL = "v2.21.41 — Унификация armor шаг 1/6: каталог брони в EQUIPMENT_CATALOG. Создан db_schema/equipment_items/armor.py с 16 предметами (4 архетипа × 4 редкости): armor_free1..armor_mythic4. Базовые статы (class_strength/agility/intuition/endurance), special_bonus, цены, recommended_level, texture_key, legacy_class_id — для миграции данных в коммите 2. armor_mythic4 = заготовка legendary_usdt (0 базовых статов, free_stats=19, custom_name_supported). _default_set_id автоматом мапит set_id по формату armor_<rarity><num>. Никто пока не использует — switch_class/wardrobe продолжают работать как раньше. Тесты 7/7, регрессий 0 (276/276). Следующий шаг: таблицы armor_custom_mods, player_owned_armor + миграция."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.92"
