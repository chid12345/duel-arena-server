"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.63"
VERSION_LABEL = "v2.21.63 — переименован armor_html_overlay.js → armor_overlay_v2.js для обхода кэша Telegram WebView. У игрока на Android Telegram держит старый JS даже с уникальным ?v= параметром. С новым именем файла кэш не сработает. Также подтверждено: equipment_rentals в Postgres работает корректно (4 аренды у игрока), list_active_rentals их возвращает. Проблема была только в Telegram-кэше старого JS без _loadActiveRentals."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.14"
