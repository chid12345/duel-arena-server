"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.12"
VERSION_LABEL = "v2.22.12 — armor2 Легендарная: убран промежуточный оверлей при покупке. Раньше тап «💳 $11.99» в карточке открывал LegendaryArmor2-оверлей где надо было повторно нажать «Купить» — пользователи путались. Теперь armor2_overlay.js::_doAction для buy_legendary_usdt/buy_legendary_stars СРАЗУ создаёт invoice (armor2_legendary_usdt_invoice / armor2_legendary_stars_invoice), открывает CryptoPay/Stars, сохраняет la2PendingInvoice в localStorage и стартует window.LA2._startCryptoPolling — выдача брони идёт по тому же пути что и обычная armor2. Оверлей распределения +19 статов открывается ТОЛЬКО когда броня уже куплена (a.owned=true в каталоге, см. armor2_overlay.js:384). version.py 2.22.11→2.22.12, GAME_VERSION 17.62→17.63."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.63"
