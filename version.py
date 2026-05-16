"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.38"
VERSION_LABEL = "v2.21.38 — UX Вариант В для armor (брони). Пользователь обнаружил: у armor нет recLevel → LevelLock не сработал. Добавлен recLevel в 16 armor-предметов wardrobe_html_overlay.js: free=1, gold=20, diamonds=45, mythic+legendary_usdt=65. _btnHtml — теперь возвращает LevelLock.lockedBtn() если уровень не достигнут (перед free/gold/diamonds/mythic ветками). _cardHtml — класс 'locked' для приглушения карточки + бейдж LevelLock.buildBadge() рядом со звёздами. Теперь броня ведёт себя как остальные 5 слотов (шлем/щит/сапоги/кольцо/оружие)."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "16.89"
