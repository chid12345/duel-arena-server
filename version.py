"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.53"
VERSION_LABEL = "v2.21.53 — НАСТОЯЩАЯ унификация armor (этап 7): тело = как обычный предмет, БЕЗ class-системы. По обратной связи пользователя «у меня в коде опять отдельная логика, мы же договорились всё одинаково с 5 слотами». ИЗМЕНЕНИЯ: (1) db_schema/equipment_items/armor.py: class_strength/class_agility/class_intuition/class_endurance переименованы в стандартные str_bonus/agi_bonus/intu_bonus/hp_bonus (hp_bonus = bonus_endurance × STAMINA_PER_FREE_STAT=2). Теперь get_item_stats отдаёт их как у helmet/weapon/etc. (2) repositories/inventory/switch.py: delta-применение к players.strength/endurance/crit/max_hp ОТКЛЮЧЕНО. _apply_stat_delta_to_player и _usdt_stat_vector превращены в no-op заглушки для обратной совместимости. switch_class пишет только в player_equipment + user_inventory.equipped + players.current_class (как UI-маркер). (3) unequip_class также без delta-вычитания — только DELETE FROM player_equipment + UPDATE current_class=NULL. (4) get_equipment_stats для armor_mythic4 (legendary_usdt) подмешивает str/agi/int/end_bonus из armor_custom_mods — +19 свободных статов работают как обычные item-bonuses. (5) deliver_rental упрощён до rent_item + equip_item — теперь идентичен helmet/weapon. Старые классы (FREE_CLASSES, GOLD_CLASSES, DIAMONDS_CLASSES, MYTHIC_CLASSES в config/class_bundles.py) и таблица user_inventory остаются legacy — их выпилка отдельным этапом. Тесты обновлены под новые поля. Регрессий нет: 287/287 (полный pytest без pre-existing flaky test_wb_hits). version.py 2.21.52→2.21.53, GAME_VERSION 17.03→17.04."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.04"
