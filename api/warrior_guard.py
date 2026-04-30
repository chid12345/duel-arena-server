"""warrior_guard.py — серверная страховка от входа в бой без выбранного воина.

Источник истины валидных типов: api/warrior_type_route.py::VALID_WARRIOR_TYPES.
Боевые классы — только tank/agile/crit (со скинами _0/_1/_2).
'default'/None/'' = "ещё не выбрал" → бой запрещён.

Используется во всех точках входа в бой:
  - /api/battle/find          (PvP / бот)
  - /api/titans/start         (Башня)
  - /api/endless/start        (Натиск)
  - /api/battle/challenge/accept

Ответ при отказе: {"ok": False, "reason": "no_warrior"}.
Клиент уже умеет показать тост и открыть выбор воина (menu_warrior_guard.js).
"""
from __future__ import annotations

_BATTLE_CLASSES = ("tank", "agile", "crit")


def warrior_selected(player: dict) -> bool:
    """True — игрок выбрал боевой класс. Скин (tank_1, agile_2 и т.п.) — ок."""
    if not player:
        return False
    wt = str(player.get("warrior_type") or "").split("_", 1)[0]
    return wt in _BATTLE_CLASSES


def no_warrior_response() -> dict:
    """Стандартный отказ: клиент по reason='no_warrior' откроет выбор воина."""
    return {"ok": False, "reason": "no_warrior"}
