"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.26"
VERSION_LABEL = "v2.21.26 — Balance Этап 7A: полная зачистка starter_pack. Удалены apply_starter_pack/is_starter_pack_used из repositories/users/premium.py, ветки в 4 payment routes, UI-блок в webapp/shop_html_pay.js, поле в tma_player_api, тест test_apply_starter_pack_only_once, обработчик в tools/recover_crypto_invoice.py, записи в tma_catalogs (STARS+CRYPTO). Также удалена миграция 2026_05_10_002_starter_pack_used и колонка starter_pack_used (живых игроков нет — радикальная зачистка). 255/255."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.77"
