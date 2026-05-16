"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.36"
VERSION_LABEL = "v2.21.36 — UX Этап 3 (Вариант В): tier-блокировка карточек по уровню. Новый helper webapp/level_lock_helper.js (isLocked/buildBadge/lockedBtn/cardLockedClass) с CSS .wd-card.locked + .wd-lvl-badge + .wd-btn.locked. Подключён в index.html. Применён в 5 overlay (helmet/shield/boots/ring/weapon): _btn возвращает серую кнопку «🔒 С N ур.» если уровень не достигнут, _card получает класс 'locked' (приглушённая карточка), рядом с рейтингом — бейдж «🔒 N+ ур» (красный) или «✓ N+ ур» (зелёный). disabled-атрибут блокирует клик."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.87"
