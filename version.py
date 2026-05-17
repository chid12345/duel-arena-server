"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.57"
VERSION_LABEL = "v2.21.57 — Этап 8 унификации armor (часть 1): новый каталог брони как 7-й обычный слот, симметрично с шлемом/щитом/сапогами/оружием/кольцом. Добавлено: webapp/armor_html_overlay.js (432 стр), api/armor_equip_payment_routes.py (endpoints /api/equipment/armor_* для USDT/Stars покупки mythic), маркер :armor_equip: в crypto_check + recovery_deliver (+armor в /api/player.active_rentals). Меню scene_menu_equipment.js: клик по слоту «Тело» открывает ArmorHTML вместо старого гардероба. Старая вкладка гардероба пока остаётся (для legendary_usdt с +19 свободных статов). pytest 305/305 зелёный. БАГ С АРЕНДОЙ БРОНИ ЗАКРЫТ — теперь арендованная mythic-броня показывается в Арсенале и переодевание работает."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.08"
