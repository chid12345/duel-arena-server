"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.30"
VERSION_LABEL = "v2.22.30 — КРАСИВЫЙ СТАТУС ОПЛАТЫ. Новый общий компонент webapp/common/payment_status.js (киберпанк): после оплаты USDT вместо тишины показывается оверлей «⚡ Проверяю оплату…» (спиннер + прогресс-бар), который сам превращается в «✅ Получено!» когда товар выдан. Резервная кнопка «Я уже оплатил — проверить» появляется через 20 сек (триггерит немедленный poll). Интегрирован в покупку брони armor2: legendary (legendary_armor2/polling.js — show при fresh-покупке, success при paid) и обычная mythic (armor2_overlay.js buy_usdt + _startArmor2CryptoPolling). PaymentStatus.show/success/hide/isOpen — общий API, дальше подключим к helmet/shield/weapon/boots/ring тем же одним вызовом. version.py →2.22.30, GAME_VERSION →17.80."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.80"
