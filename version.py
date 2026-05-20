"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.29"
VERSION_LABEL = "v2.22.29 — ХОТФИКС после объединения таблиц брони: на Postgres падали equip и /api/player → «Ошибка сервера» при покупке + пустой арсенал. Причина: литеральный '%' в LIKE 'armor2_%' конфликтует с psycopg-параметрами (на SQLite/тестах ок, на проде Postgres ломается). Фикс: паттерн вынесен в ПАРАМЕТР запроса (LIKE ? со значением 'armor2%') во всех местах — armor2_mods_repo.get_owned_armor2, equipment_repo.get_owned_weapons, equipment_routes (owned_ids/owned_armor2), tma_route_player (weapons/armor2). Данные на проде не потеряны — миграция переноса (без '%') отработала, арсенал восстанавливается после фикса чтения. version.py →2.22.29, GAME_VERSION →17.79."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.79"
