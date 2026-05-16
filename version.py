"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.42"
VERSION_LABEL = "v2.21.42 — Унификация armor шаг 2/6: новые таблицы + миграция данных. Созданы player_owned_armor (что куплено, аналог player_owned_weapons) и armor_custom_mods (+19 свободных статов для legendary_usdt: str/agi/int/end_bonus + custom_name + applied). Миграции part10_armor_unify: SQLite + Postgres (ddl_08_armor_unify). Перенос данных INSERT OR IGNORE из user_inventory: 16 archetype-классов → player_owned_armor (с маппингом legacy_class_id → новый item_id), USDT-кастомка → armor_custom_mods. Новый mixin ArmorModsMixin: add_owned_armor/get_owned_armor/is_armor_owned/get_armor_custom_mods/upsert_armor_custom_mods/reset_armor_custom_mods. switch_class пока работает как раньше — dual-write в коммите 3. Тесты 10/10. Регрессий нет (точечная проверка test_critical+test_armor_unified). Следующий: switch_class → equip_item('armor')."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.93"
