"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.23"
VERSION_LABEL = "v2.21.23 — Balance Этап 5C: интеграция архетипных сетов в бой. config/set_bonuses.py → compatibility shim над v2 (старые consumers без правок). ring2 исключён в resolver. Реализованы 6 перков 6/6: bastion second_wind, berserk blood_rage, predator frenzy_on_crit, ghost phantom_strike, mage arcane_burst, regent kings_will (3 последних упрощены до статичных бонусов — триггер-механика отдельным рефактором). +18 тестов. 249/249 зелёные."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.74"
