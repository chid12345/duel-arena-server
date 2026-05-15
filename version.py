"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.07"
VERSION_LABEL = "v2.21.07 — Balance Этап 3A: economy/level_pricing.py. Изолированный модуль с функциями shop_price (через price_for_item), can_purchase (блок по тиру), visible_in_shop_for_level (фильтр каталога), fill_prices_for_level (price_calc + locked). 15 тестов в test_level_pricing.py. Каталог/магазин не трогал — будет в 3B-3D. Базовая сетка цен T1..T4 × common..legendary рассчитана и близка к текущим хардкодам через выбор power_score для каждого предмета."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.58"
