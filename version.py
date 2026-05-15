"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.20.24"
VERSION_LABEL = "v2.20.24 — tests: ⭐ ПЛАТЕЖИ Stars+USDT (13 тестов). Stars: dedup bot 15min, check после record, anti-exploit без bot=not_verified, confirm зачисляет diamonds, дубль=already_credited, mark_tma_delivered дубль. CryptoPay: create idempotent, confirm pending, ⭐ 3 ПУТИ ДОСТАВКИ (webhook+recover+polling) = ровно 1 начисление, first_purchase_col, get_paid_undelivered. Главный гарант защиты денег пользователей. Всего 86/86."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.43"
