"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.11"
VERSION_LABEL = "v2.22.11 — armor2 Легендарная (Доспех Светоносного Бога): (1) серверный фикс crypto_check.py — в блоке already_paid добавлены ветки для :armor2_legendary: и :armor2_legendary_reset: (раньше клиент получал голый paid:true без owned_armor2, оверлей оставался в «не куплено»); (2) клиентский глобальный polling — legendary_armor2/polling.js теперь регистрирует visibilitychange/focus/document-load handlers через N._resumePolling, поллинг идёт даже если оверлей закрыт; первый запрос через 800мс вместо 4с (webhook обычно успевает раньше); (3) overlay.js — emoji 💠 заменён на настоящую картинку armor_mythic4.png (cache-bust ?v=17.62) с glow-эффектом. version.py 2.22.10→2.22.11, GAME_VERSION 17.61→17.62."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.62"
