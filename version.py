"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.29"
VERSION_LABEL = "v2.21.29 — Balance Этап 7D: +3 эксклюзивных премиум-квеста (55g + 1💎 + 100xp каждый). reward_calculator.py — новая difficulty 'premium' для daily (55,1,100). definitions_tasks.py — dq_prem_buy1/bot5/play3 с premium_only=True (track: shop_buys/bot_wins/battles). progress_daily.py — фильтр по премиум-статусу: F2P не видит квесты, премиум видит все. 3 теста: hidden_for_f2p, visible_for_premium, claim_credits. 262/262."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.80"
