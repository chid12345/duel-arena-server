"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.48"
VERSION_LABEL = "v2.21.48 — Хотфикс отображения armor в профиле: после надевания брони в гардеробе слот «тело» оставался ПУСТЫМ (картинки нет), хотя статы прибавлялись. Причина: /api/wardrobe/equip и /unequip возвращали только player+wardrobe_payload, но НЕ обновлённый equipment. Клиент не имел свежих данных State.equipment.armor → _slotInfo возвращал null → слот пустой. Фикс симметричен паттерну остальных 5 слотов: api/wardrobe_routes/core_routes.py теперь добавляет result['equipment'] = db.get_equipment(uid) в /equip и /unequip; webapp/wardrobe_html_actions.js обновляет State.equipment = res.equipment после успеха (как делают helmet/weapon/shield/boots/ring overlay). Найдено в продакшен-тесте пользователя: «купил, надел, статы выросли, но в слоте Тело пусто». version.py 2.21.47→2.21.48, GAME_VERSION 16.98→16.99."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.99"
