"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.21"
VERSION_LABEL = "v2.7.21 — PERF UI: убран лишний _buildTabBar при смене badge; dirty-флаг в recomputeMax (не итерировать children на каждый тап); ripple переиспользуется вместо create/destroy."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.91"
