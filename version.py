"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.67"
VERSION_LABEL = "v2.21.67 — унификация slot=armor с 5 остальными слотами: (1) Stars-payload armor_equip_stars теперь обрабатывается через unified-путь add_owned_armor+equip_item+auto-sync current_class (раньше тихо терялся — баг!), (2) USDT webhook _equip_map содержит armor (раньше доставка только через crypto_check polling), (3) :armor_class: legacy-маркер оставлен только для legendary_usdt (armor_mythic4 +19 свободных статов), (4) общий webapp/common/rental_badge.js: бейдж «🕐 Аренда · Nд» теперь есть во всех 6 overlay-вкладках (раньше только armor), (5) /api/player возвращает rental:{expires_at,seconds_left,days_left} в каждом слоте, (6) weapon_html_overlay: добавлена аренда в ownedSet (раньше арендованное мифик-оружие выпадало из Арсенала), (7) purchase_class больше не пушит delta-статы в players (двойной счёт устранён — статы шли и через players.strength, и через get_equipment_stats), (8) equip_item('armor') auto-синхронизирует players.current_class из legacy_class_id брони — battle perks (берсеркер +12%, страж -3%) работают для всех путей покупки/аренды без legacy switch_class."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.18"
