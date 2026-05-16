"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.43"
VERSION_LABEL = "v2.21.43 — Унификация armor шаг 3/6: switch_class пишет в player_equipment.armor + get_equipment видит armor как 6-й слот. switch_class теперь dual-write: после UPDATE players.current_class также пишет в player_owned_armor (idempotent) и player_equipment(slot='armor') через маппинг legacy_class_id → item_id (новая утилита legacy_class_to_armor_item_id в db_schema/equipment_items/armor.py). Для USDT-кастомок копирует saved-поля и custom_name из user_inventory в armor_custom_mods. unequip_class и resync_player_stats теперь чистят player_equipment.armor. get_equipment расширен: видит armor через player_equipment, fallback на players.current_class если в player_equipment пусто, mythic-чек для armor через get_owned_armor + рента. БОНУС: аренда мифик-брони начала физически работать (рента + надевание). Тесты 8 новых: switch_class пишет в pe.armor, обновление, unequip удаляет, get_equipment возвращает armor, fallback из current_class, mythic-блок без owned, mythic-ok с owned, mythic-ok с rental. 18/18 в test_armor_unified, 56/56 в test_armor+inventory+equipment+set_bonuses+critical+rental. Также починен class-level флаг _inventory_schema_ensured (сброс в фикстуре db — баг существовал до этого, всплыл из-за наших тестов). version.py 2.21.42→2.21.43, GAME_VERSION 16.93→16.94."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.94"
