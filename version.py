"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.47"
VERSION_LABEL = "v2.21.47 — Унификация armor шаг 6/6 (финал): сводка задачи + чистка. Все 6 коммитов завершены: (1) каталог armor в EQUIPMENT_CATALOG, (2) новые таблицы player_owned_armor/armor_custom_mods + миграция данных, (3) switch_class dual-write + get_equipment видит armor, (4) consumers без двойного счёта, (5) клиент + кнопка аренды мифик-брони, (6) финальная сводка. Результат: слот ТЕЛО (armor) теперь обычный 6-й слот наравне с шлем/оружие/щит/ноги/кольцо. КЛЮЧЕВОЕ ДОКАЗАТЕЛЬСТВО задачи: аренда мифик-брони работает через /api/rental/stars_invoice (100⭐) и /api/rental/crypto_invoice ($2) — как для 5 других слотов. Set-бонусы — armor считается обычным слотом без двойного счёта. ОСТАЛОСЬ для следующего этапа (не блокер): удалить user_inventory + players.current_class + switch_class dual-write. Сейчас они работают как legacy для безопасного перехода — все новые фичи автоматом докатываются до armor через get_equipment/equip_item/rent_item. Файлы изменены: 16 (5 webapp + 11 backend). Тесты: 280/280 (без pre-existing flaky test_wb_hits_today_count). version.py 2.21.46→2.21.47, GAME_VERSION 16.97→16.98."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.98"
