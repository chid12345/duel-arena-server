"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.28"
VERSION_LABEL = "v2.21.28 — Balance Этап 7C: кнопка «Удвоить следующий бой» — 1 раз в день для премов. Новые колонки next_battle_x2/next_battle_x2_date в players (sqlite_migrations_part7_premium.py + postgres after_ddl). Новый миксин UsersPremiumPerksMixin (premium.py был 230 → распилен): activate/consume/get_status. economy/premium_bonus.consume_next_battle_x2 — удваивает gold+xp в end_battle.py, сжигает флаг. API: POST /api/premium/next_battle_x2/use, GET /api/premium/next_battle_x2/status. 3 теста: requires_premium, activate_and_consume, once_per_day. 259/259."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.79"
