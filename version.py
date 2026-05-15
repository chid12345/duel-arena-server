"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.04"
VERSION_LABEL = "v2.21.04 — Balance Этап 2C: магические числа боя в economy.json. Новая секция combat: pvp_winrate_bonus 1.30, pvp_repeat_factor (anti-friend-farm пороги 3/6 → 0.5/0.2), xp_boost_mult 1.5, bot_win_gold_multiplier 0.8. battle_system/mixins/end_battle.py читает через get_combat()/get_combat_dict(). Цифры баланса НЕ менялись — это переезд для геймдиза. +5 тестов в test_economy_formulas. 118/118 зелёные."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.55"
