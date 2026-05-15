"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.09"
VERSION_LABEL = "v2.21.09 — Balance Этап 3C: tier/power_score/recommended_level в каталог шмота. Каждый из 64 предметов помечен T1@1/T2@20/T3@45/T4@65 с power_score, откалиброванным под текущие цены ±5% (max 2.7%). Алиас 'mythic' → 'legendary' в shop_price. Новый тест-страж test_real_catalog_prices_match_formula_within_5pct защищает калибровку. Magazin продолжает читать price_gold/diamonds/stars — переключение на формулу в 3D. 140/140 зелёные."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.60"
