"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.20.19"
VERSION_LABEL = "v2.20.19 — tests: формулы экономики (12 тестов). PU/gold/diamond конвертеры с округлением вверх, reward_for_task грид+фолбек, price_for_item для всех 4 валют, ev_for_box overflow, apply_premium_gold/xp +25%, xp_per_win/loss/to_next/for_task. БД не нужна."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.38"
