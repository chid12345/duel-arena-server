"""Лут-боксы: серверная рандомизация дропа."""

from __future__ import annotations

import random
from typing import Any, Dict, Tuple

# Пул обычного ящика (150g) — (item_id, вес)
_COMMON_POOL = [
    ("scroll_str_3",   30),
    ("scroll_end_3",   30),
    ("scroll_crit_3",  20),
    ("scroll_armor_6", 15),
    ("scroll_hp_100",  20),
    ("scroll_warrior", 10),
    ("scroll_shadow",  10),
    ("scroll_fury",    10),
    ("xp_boost_5",     20),
    ("scroll_str_6",    5),   # diamond-уровень: редко
    ("scroll_end_6",    5),
    ("scroll_all_4",    1),   # супер-редко
]

# Пул редкого ящика (50d) — (item_id, вес)
_RARE_POOL = [
    ("scroll_str_6",    25),
    ("scroll_end_6",    25),
    ("scroll_crit_6",   20),
    ("scroll_dodge_5",  15),
    ("scroll_armor_10", 15),
    ("scroll_hp_200",   15),
    ("scroll_double_10", 10),
    ("scroll_bastion",  10),
    ("scroll_predator", 10),
    ("scroll_all_4",    15),
    ("xp_boost_20",     10),
    ("scroll_str_12",    3),   # USDT-уровень: редко
    ("scroll_end_12",    3),
    ("scroll_crit_12",   2),
    ("scroll_all_12",    1),   # супер-редко
]

# Пул эпического ящика ($2 USDT) — (item_id, вес)
_EPIC_POOL = [
    ("scroll_str_12",   25),
    ("scroll_end_12",   25),
    ("scroll_crit_12",  20),
    ("scroll_hp_500",   20),
    ("scroll_all_12",   20),
    ("scroll_titan",    10),
]


def _weighted_choice(pool: list) -> str:
    items, weights = zip(*pool)
    return random.choices(items, weights=weights, k=1)[0]


def _open_box_free(box_id: str, db: Any, user_id: int) -> Dict[str, Any]:
    """
    Открыть ящик из инвентаря (без списания валюты — уже оплачен при покупке/USDT).
    """
    from api.tma_catalogs import SHOP_CATALOG
    _POOL_MAP = {"box_common": _COMMON_POOL, "box_rare": _RARE_POOL, "box_epic": _EPIC_POOL}
    pool = _POOL_MAP.get(box_id)
    if not pool:
        return {"ok": False, "reason": "Неизвестный тип ящика"}
    prize_id = _weighted_choice(pool)
    db.add_to_inventory(user_id, prize_id)
    prize_info = SHOP_CATALOG.get(prize_id, {})
    from api.tma_player_api import _player_api
    player = db.get_or_create_player(user_id, "")
    return {
        "ok": True,
        "item_id": prize_id,
        "item_name": prize_info.get("name", prize_id),
        "item_icon": prize_info.get("icon", "🎁"),
        "player": _player_api(dict(player)),
    }


def open_box(box_id: str, db: Any, user_id: int) -> Dict[str, Any]:
    """
    Открыть ящик: списать цену, положить приз в инвентарь.
    Возвращает {"ok": True, "item_id": ..., "item_name": ..., "player": ...}
    """
    from api.tma_catalogs import SHOP_CATALOG

    box = SHOP_CATALOG.get(box_id)
    if not box:
        return {"ok": False, "reason": "Ящик не найден"}

    currency = box["currency"]
    price = box["price"]

    # Проверка и списание валюты
    conn = db.get_connection()
    cursor = conn.cursor()
    if currency == "gold":
        cursor.execute("SELECT gold FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or (row["gold"] or 0) < price:
            conn.close()
            return {"ok": False, "reason": f"Нужно {price} 🪙 золота"}
        cursor.execute("UPDATE players SET gold = gold - ? WHERE user_id = ?", (price, user_id))
    else:
        cursor.execute("SELECT diamonds FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if not row or (row["diamonds"] or 0) < price:
            conn.close()
            return {"ok": False, "reason": f"Нужно {price} 💎 алмазов"}
        cursor.execute("UPDATE players SET diamonds = diamonds - ? WHERE user_id = ?", (price, user_id))
    conn.commit()
    conn.close()

    # Выбрать приз
    if box_id == "box_common":
        prize_id = _weighted_choice(_COMMON_POOL)
    elif box_id == "box_rare":
        prize_id = _weighted_choice(_RARE_POOL)
    else:
        prize_id = _weighted_choice(_EPIC_POOL)

    # Положить в инвентарь
    db.add_to_inventory(user_id, prize_id)

    prize_info = SHOP_CATALOG.get(prize_id, {})
    prize_name = prize_info.get("name", prize_id)
    prize_icon = prize_info.get("icon", "🎁")

    player = db.get_or_create_player(user_id, "")
    from api.tma_player_api import _player_api
    return {
        "ok": True,
        "item_id": prize_id,
        "item_name": prize_name,
        "item_icon": prize_icon,
        "player": _player_api(dict(player)),
    }
