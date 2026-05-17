"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.54"
VERSION_LABEL = "v2.21.54 — Шарды (поверх настоящей унификации armor): убран WB-дроп, добавлен счётчик 💠 на главной, починены 4 теста. (1) repositories/world_boss/rewards_calc.py — удалён блок add_shards при победе (шарды теперь ТОЛЬКО через разборку шмота). (2) api/tma_route_player.py — /api/player возвращает shards: {T1, T2, T3, T4}. (3) webapp/scene_menu_ext4.js — 3-й chip 💠 (cyan ромб) после 🪙/💎 в шапке профиля, сумма всех тиров. (4) webapp/upgrade_modal.js — обновляет State.shards после apply/dismantle. Починены: test_wb_drops_shards → test_wb_no_longer_drops_shards; test_wb_hits_today_count — UTC вместо local date (timezone bug); test_wipe_resets_profile — autouse-сброс _inventory_schema_ensured в conftest для изоляции между тестами. 294/294 зелёные."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.05"
