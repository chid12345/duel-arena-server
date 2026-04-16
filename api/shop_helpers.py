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
    "exchange_small":  (5,  350),
    "exchange_medium": (15, 1100),
    "exchange_large":  (50, 4000),
}


def _finalize(db, uid: int, result: dict) -> dict:
    if result.get("ok"):
        player = db.get_or_create_player(uid, "")
        result["player"] = _player_api(dict(player))
    return result


def _buy_hp(db, uid: int, price: int, pct: float) -> dict:
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT gold, max_hp, current_hp FROM players WHERE user_id = ?", (uid,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"ok": False, "reason": "Игрок не найден"}
    max_hp = int(row["max_hp"] or 100)
    cur_hp = int(row["current_hp"]) if row["current_hp"] is not None else max_hp
    if cur_hp >= max_hp:
        conn.close()
        return {"ok": False, "reason": "HP уже полное!"}
    if (row["gold"] or 0) < price:
        conn.close()
        return {"ok": False, "reason": f"Нужно {price} 🪙 золота"}
    if pct >= 1.0:
        new_hp = max_hp
    else:
        new_hp = min(max_hp, cur_hp + max(1, int(max_hp * pct)))
    # Атомарное списание: WHERE gold >= price AND current_hp < max_hp защищает от race condition
    notify_flag = 1 if new_hp >= max_hp else 0
    cursor.execute(
        "UPDATE players SET gold = gold - ?, current_hp = ?, last_hp_regen = ?, hp_full_notified = ? "
        "WHERE user_id = ? AND gold >= ? AND current_hp < max_hp",
        (price, new_hp, datetime.utcnow().isoformat(), notify_flag, uid, price),
    )
    rows_affected = cursor.rowcount
    conn.commit()
    conn.close()
    if rows_affected == 0:
        return {"ok": False, "reason": f"Нужно {price} 🪙 золота"}
    player = db.get_or_create_player(uid, "")
    return {"ok": True, "hp_restored": new_hp - cur_hp, "new_hp": new_hp, "max_hp": max_hp,
            "player": _player_api(dict(player))}


def _buy_to_inventory(db, uid: int, item_id: str, price: int, currency: str) -> dict:
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
    # Валюта уже списана — add_to_inventory не должна упасть молча
    try:
        db.add_to_inventory(uid, item_id)
    except Exception as e:
        log.critical("add_to_inventory failed uid=%s item=%s: %s", uid, item_id, e)
        return {"ok": False, "reason": "Ошибка выдачи предмета. Средства будут возвращены — обратитесь в поддержку"}
    player = db.get_or_create_player(uid, "")
    from api.tma_catalogs import SHOP_CATALOG
    info = SHOP_CATALOG.get(item_id, {})
    return {"ok": True, "added_to_inventory": True, "item_id": item_id,
            "item_name": info.get("name", item_id), "player": _player_api(dict(player))}


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
    # Валюта уже списана — add_to_inventory не должна упасть молча
    try:
        db.add_to_inventory(uid, item_id)
    except Exception as e:
        log.critical("add_to_inventory(xp_boost) failed uid=%s item=%s: %s", uid, item_id, e)
        return {"ok": False, "reason": "Ошибка выдачи предмета. Средства будут возвращены — обратитесь в поддержку"}
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
