"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.37"
VERSION_LABEL = "v2.21.37 — Этап 9D+9E+9F: боты выглядят как живые игроки в PvP. 9D миграция part9 — колонка warrior_type в bots (PG after_ddl + sqlite_ddl + migration_ids). 9E generate.py — 9 классов BOT_WARRIOR_TYPES (tank/agile/crit × 0/1/2), random при создании, _normalize_bot_dict даёт стабильный псевдослучайный warrior_type по bot_id для старых ботов (dom=tank_0 → подмена). 9F auto-fallback под маской PvP: FindBattleBody.disguise_as_pvp; battle_find.py ставит _disguise_as_pvp на opponent+battle; tma_battle_api.py → opp_is_bot=false, opp_persona=null, opp_is_premium=true для donator под маской. Фронт scene_queue_ext.js — таймер 30с → авто /api/battle/find {prefer_bot, disguise_as_pvp}. 269/269."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.88"
