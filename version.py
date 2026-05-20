"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.33"
VERSION_LABEL = "v2.22.33 — откат красивого статус-оверлея оплаты (UX не зашёл). Удалён webapp/common/payment_status.js + подключение в index.html; убраны вызовы PaymentStatus.show/success из legendary_armor2/polling.js и armor2_overlay.js — вернулись к обычным тостам _notify. Выдача покупок не затронута: serverный авто-разбор (jobs/payment_settler) + клиентский polling работают как прежде. version.py →2.22.33, GAME_VERSION →17.83."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.83"
