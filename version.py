"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.06"
VERSION_LABEL = "v2.21.06 — Balance Этап 2E: legacy daily_main_quest (55g/150xp) в economy.json. Дефолты сняты из repositories/battles/daily_quests.py:106 — теперь функция читает награду из economy.json через get_daily_main_quest_reward(). Этап 2 завершён полностью: HP-зелья формулой, магазин унифицирован, бой/WB/legacy daily — все балансные числа в едином config/economy.json. 125/125 зелёных. Далее Этап 3 — магазин по уровням."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.57"
