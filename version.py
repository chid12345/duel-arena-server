"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.00"
VERSION_LABEL = "v2.21.00 — Balance Redesign Этап 1: tools/balance_xlsx_export.py (генератор) + config/balance_curve.json (кривые по уровням) + economy/curves.py (геттеры power/tier_unlock/pvp_bracket/days_to_reach). Якорь 35 дней до 80 ур, T2@20/T3@45/T4@65, PvP 4 брекета (1-10/11-25/26-50/51-80). 16 новых тестов зелёные. Калькулятор_экономики_игры.xlsx переписан под Duel Arena."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.51"
