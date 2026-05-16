"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.33"
VERSION_LABEL = "v2.21.33 — Balance Этап 8E+8F+8G: аренда mythic — фикс цена 100⭐/$2 + USDT-путь + киберпанк-модалка. economy/rental_pricing.py: RENTAL_PRICE_STARS=100, RENTAL_PRICE_USDT='2.00' (вместо 50% от полной цены). api/rental_routes.py: добавлен POST /api/rental/crypto_invoice ($2 USDT). api/payment_routes/rental_deliver.py — общий helper deliver_rental+parse_rental_payload. Три USDT-пути доставки: crypto_check.py (success+already_paid), crypto_webhook.py, tools/recover_crypto_invoice.py — обработка payload `uid:{uid}:rental:{item_id}`. webapp/rental_pay.js — модалка openModal в .spd-* стиле: 4 строки инфо + 2 кнопки Stars/USDT (золотой/зелёный градиенты как в остальном магазине). 6 тестов аренды (фикс цены, deliver_rental, rent + expire + extension + cleanup + bot handler). 269/269."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.84"
