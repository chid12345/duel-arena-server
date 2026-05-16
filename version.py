"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.34"
VERSION_LABEL = "v2.21.34 — Этап 9 (запуск-готовность): боты на всех уровнях 1-80, английские ники, премиум-бейдж donator. config/economy_messages_avatar.py: BOT_COUNT_BY_LEVEL расширен на 1-80 (50 на 1-й + 100 на 2-80 = 7950 ботов всего). Распределение по 4 брекетам: 1-10=950, 11-25=1500, 26-50=2500, 51-80=3000. BOT_NAMES переписан на английские game-handle стиль (Flykiller/Vortex/DarkWolf/Reaper и т.д., ~70 имён). BOT_PREFIXES — английские (Lord/King/Dark/Iron), для новичков чаще без префикса. repositories/bots/generate.py — пустой префикс не клеит лишний '_'. repositories/bots/personas.py — display_name корректно обрабатывает оба формата (base_uuid и prefix_base_uuid). api/tma_battle_api.py — бот-донатер получает opp_is_premium=True + persona скрывается (маскируется под живого премиум-игрока). 269/269."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.85"
