"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.21.52"
VERSION_LABEL = "v2.21.52 — Хотфикс №4 аренды armor: SQLite INSERT OR IGNORE падал на Postgres-проде. Симптом: на проде платёж приходит (зелёное окошко polling), но deliver_rental не доставляет armor — у шлема/оружия работает, у брони нет. Корень: я использовал INSERT OR IGNORE INTO user_inventory — это SQLite-only синтаксис. На Postgres (production через Render) это syntax error → исключение → deliver_rental failed → silent fail. Фикс: заменил сырой SQL на универсальный путь через db.has_class + db.purchase_class (mythic-классы имеют price_gold=0, price_diamonds=0 → бесплатная регистрация) + db.switch_class (delta-стат). Работает на обоих диалектах. Тесты 43/43. version.py 2.21.51→2.21.52, GAME_VERSION 17.02→17.03."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.03"
