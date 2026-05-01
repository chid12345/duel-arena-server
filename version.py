"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.7.08"
VERSION_LABEL = "v2.7.08 — fix: WebSocket — init_data теперь в первом сообщении вместо URL (Render proxy обрезал длинный URL у premium-юзеров с photo_url → 1008 → 'closed before established'). Сервер: ws.accept() ДО auth-проверки + fallback на auth-message."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "11.78"
