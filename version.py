"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.48"
VERSION_LABEL = "v2.22.48 — аудит «ТЕСТ ИГРЫ», этап 2 (бой), #2 шаг 3/3 (ЗАВЕРШЕНО). Клиент больше не ходит за игрока наугад: при таймауте scene_battle_ext2.js _onAuto зовёт новый POST /api/battle/timeout (честный пропуск) вместо случайного хода; обработка ответа вынесена в общий _applyBattleResponse (его же использует _submitChoice). Серверный роут api/tma_route_battle_flow/battle_timeout.py вызывает process_turn_timeout и отдаёт исход через общий модуль _battle_outcome.deliver_battle_outcome (вынесен из battle_choice.py — один источник истины доставки раунда/конца боя по WS+HTTP для /choice и /timeout). Новая модель BattleTimeoutBody. Итог пункта #2: пропуск во всех боях для обоих игроков = 0 урона + чистый удар, 3 раза = поражение; свипер ловит закрытое приложение; клиент честно сообщает пропуск мгновенно. Босс не затронут. Тесты test_afk_round + test_afk_sweep, smoke-импорт api_server ок. version.py →2.22.48, GAME_VERSION →17.98."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.98"
