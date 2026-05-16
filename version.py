"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.31"
VERSION_LABEL = "v2.21.31 — Balance Этап 8A+8B: фундамент аренды mythic-шмота. Миграция part8 — таблица equipment_rentals (user_id, item_id, expires_at, rented_at, stars_paid). PG: after_ddl + migration_ids. Новый пакет repositories/rentals/ (RentalsMixin: rent_item/has_active_rental/list_active_rentals/cleanup_expired_rentals). database.py + tests/conftest.py подключают RentalsMixin. equipment_repo.get_equipment теперь авто-снимает mythic без owned/rental. api/equipment/equip разрешает аренду как право экипировки. Тесты: rent + expire + auto-unequip; 2 теста equipment обновлены под новую логику. 263/263."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.82"
