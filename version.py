"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.40"
VERSION_LABEL = "v2.21.40 — закрыта недоделка Этапа 1: команда balance-check (защита от рассинхрона xlsx↔json). tools/balance_xlsx_export.py — добавлен argparse + флаг --check (без записи: сравнивает текущий JSON с тем что сгенерил бы экспортёр, exit 1 при расхождении с unified diff). ASCII-маркеры [OK]/[FAIL] вместо emoji — работает в Windows cp1251 console. Makefile — два новых таргета: 'make balance-check' (для CI) и 'make balance-export' (после правки CONFIG). Если кто-то поправит CONFIG (например days_to_max_level) и забудет перезапустить экспорт — CI/Render-deploy упадёт. 269/269."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.91"
