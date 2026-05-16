"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.45"
VERSION_LABEL = "v2.21.45 — закрыта недоделка Этапа 2 поверх Унификации armor: AST-тест на хардкоды цен/множителей. tests/test_no_hardcoded_prices.py — 7 тестов через ast.walk парсят критичные файлы: (1) end_battle.py не содержит литералы 1.30/1.5/0.8 (PvP-множители из economy.json), (2) end_battle.py импортирует get_combat/get_combat_dict, (3) shop/store.py импортирует potion_price_for_hp, (4) shop/store.py не содержит legacy 60/200g (старые плоские цены), (5) world_boss/rewards_calc.py использует economy-helpers, (6) daily_quests.py не содержит старые 55/150/350/700 (удалённая legacy-таблица), (7) economy.json содержит секции potions/combat/world_boss. Защита от регресса: при подмене get_combat() на литерал тест падает с указанием строки и значения."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.96"
