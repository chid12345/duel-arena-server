"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.27"
VERSION_LABEL = "v2.21.27 — Balance Этап 7B: +10 бот-побед в день для премиум-подписчиков. economy/premium_bonus.py — новая функция bot_daily_limit_for(is_premium): F2P=20, premium=30. battle_system/mixins/end_battle.py — лимит на награду читается через эту функцию вместо хардкода BOT_DAILY_LIMIT. Тест test_bot_daily_limit_premium_plus_10 в tests/test_premium.py. 256/256."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.78"
