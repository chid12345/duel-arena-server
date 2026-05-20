"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.27"
VERSION_LABEL = "v2.22.27 — КОНЕЦ ДУАЛИЗМА ТАБЛИЦ БРОНИ. Броня жила в отдельной player_owned_armor2 → каждая операция «для всех предметов» (сброс/выдача/проверка) про неё забывала = повторяющиеся баги. Слили броню в общую player_owned_weapons (как все 5 слотов; id armor2_* не конфликтуют с weapon_*/helmet_*/…, разделяем фильтром LIKE/NOT LIKE 'armor2_%'). Изменения: (1) миграция 2026_05_20_001_merge_owned_armor2_into_weapons — перенос данных + DROP player_owned_armor2; (2) armor2_mods_repo.py add/get/is_owned/remove_owned_armor2 → общая таблица; (3) equipment_repo.get_owned_weapons исключает armor2_%; (4) equipment_routes.py + tma_route_player.py — прямые SQL на общую таблицу с фильтрами; (5) postgres_bootstrap/ddl_09_armor2.py — убран CREATE player_owned_armor2 (остался только armor2_custom_mods); (6) debug-сброс wipe_my_rentals теперь чистит и armor2_custom_mods (+19 статов легендарной). Теперь сброс мификов сбрасывает И броню — баг «броня выживает после сброса» убит в корне. armor2_custom_mods остаётся отдельной (спец-поля 1 предмета). Тесты: test_armor2_lives_in_shared_weapons_table + обновлён desync-тест. version.py →2.22.27, GAME_VERSION →17.77."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.77"
