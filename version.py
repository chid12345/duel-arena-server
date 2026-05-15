"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.15"
VERSION_LABEL = "v2.21.15 — Balance Этап 4A: формулы апгрейдов предметов. economy/upgrades_formulas.py: cost_to_upgrade_gold (pct=0.20+0.15×N от базы), success_chance (100% до +6, далее −10% за шаг, минимум 40%), shards_cost_for (N//2), dismantle_shards_for (T1=1, T2=3, T3=6, T4=12), plus_stats_for (×(1+0.08×N) для int/pct статов), can_attempt_upgrade. 20 новых тестов. БД/бой/UI не тронуты."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.66"
