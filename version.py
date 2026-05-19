"""
version.py — текущая версия проекта Duel Arena.
Обновляется при каждом значимом изменении.
"""

VERSION = "2.22.14"
VERSION_LABEL = "v2.22.14 — armor2 Легендарная: USDT-покупка теперь идёт через общий flow :armor2_equip:armor2_mythic4 (как у всех других мифик-предметов armor2/weapon/helmet/shield/ring), а не через отдельную ветку :armor2_legendary:. Юзер прямо сказал «другие вещи покупаются — это броня нет, почему не сделать по аналогии». Изменения: (1) armor2_legendary_routes.py::usdt_invoice — payload изменён с uid:{uid}:armor2_legendary:create на uid:{uid}:armor2_equip:armor2_mythic4, теперь CryptoPay webhook ловит броню проверенной веткой is_armor2_equip (та же что для mythic1-3), кладёт в player_owned_armor2 и экипирует; (2) armor2_legendary_routes.py::_state — добавлен lazy-init: если owned=True но armor2_custom_mods=None → автоматически создаём через create_legendary_armor2 при первом открытии окна настройки статов; (3) test_armor2.py — добавлен test_state_lazy_creates_mods_when_owned_but_no_mods (Закон 11). Сброс сборки за полцены ($5.99/⭐400) пока на старом payload :armor2_legendary_reset: — рабочий, не трогал. version.py 2.22.13→2.22.14, GAME_VERSION 17.64→17.65."

# Игровая версия для UI (bot / mini app). Один источник истины.
# При деплое с изменениями кода увеличивать на +0.01 (например 2.01 → 2.02).
GAME_VERSION = "17.65"
