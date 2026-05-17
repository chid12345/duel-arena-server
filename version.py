"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.56"
VERSION_LABEL = "v2.21.56 — fix(payments): recovery теперь обрабатывает 7 типов мифик-покупок (armor_class, weapon_equip, helmet_equip, boots_equip, shield_equip, ring_equip, rental). Раньше при падении webhook + клиент офлайн → деньги списаны, предмет навсегда потерян. Распил: новый файл api/payment_routes/recovery_deliver.py (174 стр), tma_startup.py упрощён до делегирования. + 7 тестов tests/test_recovery_deliver.py. pytest 303/303 зелёный."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.07"
