"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.50"
VERSION_LABEL = "v2.21.50 — КРИТИЧНО: 2 бага в аренде мифик-брони за USDT $2. (1) Не было client polling /api/shop/crypto_check после открытия CryptoPay-инвойса — webapp/rental_pay.js не дотягивал «третий путь доставки USDT» из правила проекта (webhook + crypto_check + recover). Теперь polling до 60 попыток × 5с после открытия инвойса + автоподхват pendingInvoice из localStorage при перезагрузке мини-app. (2) deliver_rental писал в player_equipment, но НЕ вызывал switch_class — у брони базовые статы (str/end/crit/max_hp) идут delta-моделью через current_class, а equip_item их не применяет. Теперь deliver_rental для slot='armor' автоматически регистрирует legacy_class_id в user_inventory (как 'mythic' доступ через аренду) и вызывает switch_class — игрок получает реальные статы мифика. Pre-existing проблема обнаружена пользователем: оплатил $2 USDT, аренда не активировалась — теперь починена для будущих платежей. Тесты 43/43 на затронутых модулях. version.py 2.21.49→2.21.50, GAME_VERSION 17.00→17.01."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.01"
