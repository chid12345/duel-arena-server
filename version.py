"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.32"
VERSION_LABEL = "v2.21.32 — Balance Этап 8 (финал): аренда mythic-шмота за Stars (7 дней за 50% цены). Этап 8C: economy/rental_pricing.py (RENTAL_DURATION_DAYS=7, rental_stars_price=full*0.5). api/rental_routes.py — POST /api/rental/stars_invoice + GET /api/rental/list. handlers/commands/shop_equip_stars.py — обработка payload `rental_stars:` → rent_item + equip_item(force=True). Этап 8D: webapp/rental_pay.js — общий helper (buildButton + rent). Кнопка «🕐 Аренда 7д · ⭐ N» добавлена в 5 overlay (helmet/shield/boots/ring/weapon). index.html подключает rental_pay.js. 5 тестов аренды (price, rent, extension stacking, cleanup, bot handler). 268/268."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.83"
