"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.20.18"
VERSION_LABEL = "v2.20.18 — tests: tests/conftest.py с общей фикстурой db (все миксины) + autouse random.seed(42); починка двух старых тестов (test_critical InventoryMixin, test_world_boss обновлённые WB-награды top-2/3)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.37"
