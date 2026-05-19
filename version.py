"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.10"
VERSION_LABEL = "v2.22.10 — распил webapp/legendary_armor2_overlay.js (327 строк > аварийного порога 300, Закон 1) на 4 модуля ≤200 строк через общий namespace window.LA2: legendary_armor2/api.js (51, _api/_notify/_load + state), legendary_armor2/polling.js (45, _startCryptoPolling + la2Pending* localStorage), legendary_armor2/actions.js (129, _doAction со всеми 8 ветками buy_usdt/buy_stars/train/untrain/passive/apply/reset_usdt/reset_stars), legendary_armor2/overlay.js (136, STATS/PASSIVES/_render/open/close + регистрация window.LegendaryArmor2). webapp/index.html:254 — одна строка заменена на 4 <script defer> в порядке api→polling→actions→overlay. Старый монолит удалён. Логика не менялась — техдолг следом за фиксом USDT polling (ba2485e)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.61"
