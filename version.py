"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.39"
VERSION_LABEL = "v2.21.39 — legendary_usdt теперь имеет обе кнопки Stars+USDT (как остальные mythic-брони). Пользователь сообщил: у «Доспеха Светоносного Бога» исчезла Stars-кнопка, нарушился унифицированный UX mythic-шмота. Frontend wardrobe_html_overlay.js — объединены mythic-rarity ветки в _btnHtml: вместо проверки type==='mythic' теперь r==='mythic' → захватывает и обычные mythic-броню, и legendary_usdt. Server-side: armor_payment_routes.py armor_stars_invoice и armor_crypto_invoice пропускают legendary_usdt (cls подменяется, payload для USDT идёт через существующий :usdt_slot: путь). handlers/commands/shop_equip_stars.py — armor_class_stars обработчик ловит class_id='legendary_usdt' → create_usdt_class (как USDT-путь). 269/269."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.90"
