"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.35"
VERSION_LABEL = "v2.21.35 — HOTFIX: pvp_find_opponent падал на проде Postgres с 500 (BEGIN IMMEDIATE — SQLite-only). repositories/battles/pvp_queue.py — теперь BEGIN IMMEDIATE выполняется только для SQLite (if not self._pg). На Postgres транзакция и так открывается автоматически с первого запроса. Регресс пришёл из Этапа 6 (PvP-брекеты). Симптом у пользователя: после нажатия 'Поиск соперника' /api/battle/find возвращал 500 → фронт показывал ошибку и оставался на меню."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.86"
