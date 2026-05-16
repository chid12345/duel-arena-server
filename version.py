"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.49"
VERSION_LABEL = "v2.21.49 — Хотфикс armor #2: cache-bust при equip/unequip. Симптом из теста пользователя: переключаю броню → выхожу в профиль → ПОКАЗАНА СТАРАЯ БРОНЯ; захожу в любой другой overlay (шлем/щит/...) и выхожу → СВЕЖАЯ БРОНЯ. Корень: scene_menu.js имеет _PROFILE_TTL=30с — при возврате из Stats scene с full HP Menu НЕ делает /api/player (cached=true), использует кэш State.equipment. У helmet/weapon обходится через destroy/_buildProfilePanel/_switchTab при закрытии overlay; у wardrobe этого хука нет. Фикс v2.21.49 в webapp/wardrobe_html_actions.js: после успешного _doAction (1) State.playerLoadedAt = 0 — force-fetch при возврате в Menu, (2) если EquipmentSlotsHTML overlay открыт прямо сейчас — EquipmentSlotsHTML.refresh(scene) сразу. Это симметрично паттерну остальных слотов и решает оба сценария: возврат через ✕ и refresh без смены сцены. version.py 2.21.48→2.21.49, GAME_VERSION 16.99→17.00."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.00"
