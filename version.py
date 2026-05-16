"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.44"
VERSION_LABEL = "v2.21.44 — Унификация armor шаг 4/6: очистка consumers без двойного счёта. resolve_active_sets (repositories/sets/set_resolver.py) больше НЕ добавляет armor виртуально из current_class — armor приходит как обычный слот в equipped с set_id. Параметр current_class оставлен для обратной совместимости (помечен noqa: ARG001). count_set_rarities в config/set_bonuses.py также убрал ветку if slot == SLOT_ARMOR — рарити берётся из equipped[armor].rarity. Без этой правки после шага 3 был бы двойной счёт armor. Тесты test_set_bonuses обновлены под новое поведение: test_resolve_armor_slot_counts_as_normal_equipment, test_resolve_current_class_param_ignored (был test_resolve_uses_current_class_as_armor), обновлён test_count_set_rarities_legacy_still_works. Новый тест test_set_resolver_no_double_count_armor защищает от регрессии. Точечный прогон 52/52: armor_unified+set_bonuses+inventory+equipment+critical. version.py 2.21.43→2.21.44, GAME_VERSION 16.94→16.95."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.95"
