"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.51"
VERSION_LABEL = "v2.21.51 — Хотфикс №3 аренды armor: 422 в polling /api/shop/crypto_check. Из консоли пользователя: GET /api/shop/crypto_check/865907 → 422 Unprocessable Content. Причина: endpoint требует init_data query-параметр, а я в rental_pay.js _startRentalPolling использовал голый fetch без него. Helmet/weapon делают через global get() helper из game_globals.js — он добавляет init_data автоматически. Фикс: rental_pay.js теперь использует get() как остальные слоты (с fallback на fetch+init_data, если get не определён). version.py 2.21.50→2.21.51, GAME_VERSION 17.01→17.02."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.02"
