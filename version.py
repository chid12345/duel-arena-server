"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.64"
VERSION_LABEL = "v2.21.64 — _loadActiveRentals использует fetch с явным cache: 'no-store' + уникальным ?_t=timestamp. Telegram WebView (Android) кэшировал ответ /api/player без active_rentals, поэтому UI каталога брони не показывал бейдж аренды несмотря на корректные данные в БД (4 аренды у игрока подтверждены через /debug_rentals)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.15"
