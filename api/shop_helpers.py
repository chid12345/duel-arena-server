"""Вспомогательные функции и константы магазина."""

from __future__ import annotations

import logging
from datetime import datetime

from api.tma_player_api import _player_api

log = logging.getLogger(__name__)


# Количество зарядов xp_boost для каждого item_id
_XP_BOOST_CHARGES = {
    "xp_boost_5":  (5,  1.5),
    "xp_boost_20": (20, 1.5),
    "xp_boost_x2": (10, 2.0),
}

# Золото за обмен алмазов
_EXCHANGE_GOLD = {
    "exchange_small":  (5,  450),
    "exchange_medium": (15, 1400),
    "exchange_large":  (50, 5000),
}


def _finalize(db, uid: int, result: dict) -> dict:
    if result.get("ok"):
        player = db.get_or_create_player(uid, "")
        result["player"] = _player_api(dict(player))
    return result


def _buy_to_inventory(db, uid: int, item_id: str, price: int, currency: str,
                      quantity: int = 1) -> dict:
    conn = db.get_connection()
    cursor = conn.cursor()
    # Атомарное списание: rowcount == 0 → недостаточно средств
    if currency == "gold":
        cursor.execute(
            "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
            (price, uid, price),
        )
    else:
        cursor.execute(
            "UPDATE players SET diamonds = diamonds - ? WHERE user_id = ? AND diamonds >= ?",
            (price, uid, price),
        )
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    if rows_affected == 0:
        symbol = "🪙 золота" if currency == "gold" else "💎 алмазов"
        return {"ok": False, "reason": f"Нужно {price} {symbol}"}
    # Валюта уже списана — если add_to_inventory упадёт, деньги игрока пропадут.
    # Поэтому при ошибке — пытаемся авто-рефанд (атомарное +N), и только
    # если он тоже упал, просим поддержку.
    try:
        db.add_to_inventory(uid, item_id, quantity=int(quantity))
    except Exception as e:
        log.critical("add_to_inventory failed uid=%s item=%s: %s", uid, item_id, e)
        refunded = False
        try:
            c2 = db.get_connection(); cur2 = c2.cursor()
            if currency == "gold":
                cur2.execute("UPDATE players SET gold = gold + ? WHERE user_id = ?", (price, uid))
            else:
                cur2.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (price, uid))
            c2.commit(); c2.close()
            refunded = True
        except Exception as e2:
            log.critical("REFUND FAILED uid=%s price=%s cur=%s: %s", uid, price, currency, e2)
        reason = ("Ошибка выдачи предмета — средства возвращены"
                  if refunded else
                  "Ошибка выдачи предмета. Обратитесь в поддержку")
        return {"ok": False, "reason": reason}
    player = db.get_or_create_player(uid, "")
    from api.tma_catalogs import SHOP_CATALOG
    info = SHOP_CATALOG.get(item_id, {})
    return {"ok": True, "added_to_inventory": True, "item_id": item_id,
            "item_name": info.get("name", item_id), "quantity": int(quantity),
            "player": _player_api(dict(player))}


def _buy_xp_boost_item(db, uid: int, item_id: str, charges: int, mult: float) -> dict:
    from api.tma_catalogs import SHOP_CATALOG
    item = SHOP_CATALOG[item_id]
    price = item["price"]
    currency = item["currency"]
    conn = db.get_connection()
    cursor = conn.cursor()
    # Атомарное списание: rowcount == 0 → недостаточно средств
    if currency == "gold":
        cursor.execute(
            "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
            (price, uid, price),
        )
    else:
        cursor.execute(
            "UPDATE players SET diamonds = diamonds - ? WHERE user_id = ? AND diamonds >= ?",
            (price, uid, price),
        )
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    if rows_affected == 0:
        symbol = "🪙 золота" if currency == "gold" else "💎 алмазов"
        return {"ok": False, "reason": f"Нужно {price} {symbol}"}
    # Валюта уже списана — при падении add_to_inventory пытаемся авто-рефанд.
    try:
        db.add_to_inventory(uid, item_id)
    except Exception as e:
        log.critical("add_to_inventory(xp_boost) failed uid=%s item=%s: %s", uid, item_id, e)
        refunded = False
        try:
            c2 = db.get_connection(); cur2 = c2.cursor()
            if currency == "gold":
                cur2.execute("UPDATE players SET gold = gold + ? WHERE user_id = ?", (price, uid))
            else:
                cur2.execute("UPDATE players SET diamonds = diamonds + ? WHERE user_id = ?", (price, uid))
            c2.commit(); c2.close()
            refunded = True
        except Exception as e2:
            log.critical("REFUND FAILED uid=%s price=%s cur=%s: %s", uid, price, currency, e2)
        reason = ("Ошибка выдачи предмета — средства возвращены"
                  if refunded else
                  "Ошибка выдачи предмета. Обратитесь в поддержку")
        return {"ok": False, "reason": reason}
    player = db.get_or_create_player(uid, "")
    return {"ok": True, "added_to_inventory": True, "item_id": item_id,
            "charges": charges, "player": _player_api(dict(player))}


def _exchange_diamonds(db, uid: int, cost_diamonds: int, gold_gain: int) -> dict:
    conn = db.get_connection()
    cursor = conn.cursor()
    # Атомарное списание: rowcount == 0 → недостаточно алмазов
    cursor.execute(
        "UPDATE players SET diamonds = diamonds - ?, gold = gold + ? WHERE user_id = ? AND diamonds >= ?",
        (cost_diamonds, gold_gain, uid, cost_diamonds),
    )
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    if rows_affected == 0:
        return {"ok": False, "reason": f"Нужно {cost_diamonds} 💎 алмазов"}
    player = db.get_or_create_player(uid, "")
    return {"ok": True, "gold_gained": gold_gain, "player": _player_api(dict(player))}
