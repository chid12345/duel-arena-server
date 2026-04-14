"""Лут-боксы: серверная рандомизация мульти-дропа."""

from __future__ import annotations

import random
from typing import Any, Dict, List, Tuple

# ── Пулы предметов (item_id, вес) ────────────────────────────────────────────

_GOLD_SCROLLS = [
    ("scroll_str_3",   30), ("scroll_end_3",   30), ("scroll_crit_3",  20),
    ("scroll_armor_6", 15), ("scroll_hp_100",  20), ("scroll_warrior", 10),
    ("scroll_shadow",  10), ("scroll_fury",    10),
]
_DIAMOND_SCROLLS = [
    ("scroll_str_6",    25), ("scroll_end_6",    25), ("scroll_crit_6",   20),
    ("scroll_dodge_5",  15), ("scroll_armor_10", 15), ("scroll_hp_200",   15),
    ("scroll_double_10", 10), ("scroll_bastion", 10), ("scroll_predator", 10),
    ("scroll_all_4",    15),
]
_USDT_SCROLLS = [
    ("scroll_str_12",  25), ("scroll_end_12",  25), ("scroll_crit_12", 20),
    ("scroll_hp_500",  20), ("scroll_all_12",  15),
]


def _pick(pool: list) -> str:
    items, weights = zip(*pool)
    return random.choices(items, weights=weights, k=1)[0]


def _pick_n(pool: list, n: int) -> List[str]:
    """Выбрать n предметов (с повторами)."""
    items, weights = zip(*pool)
    return random.choices(items, weights=weights, k=n)


# ── Генераторы дропа ─────────────────────────────────────────────────────────

def _generate_common(db, uid) -> Dict[str, Any]:
    """📦 Обычный ящик (150🪙) — Вариант B щедрый: 2–4 предмета."""
    drops: List[Dict] = []
    count = random.choice([2, 2, 3, 3, 3, 4])  # чаще 3

    # Основа: gold-свитки
    for item_id in _pick_n(_GOLD_SCROLLS, count):
        drops.append({"type": "item", "item_id": item_id})

    # 5% шанс: один слот заменяем на алмазный свиток
    if random.random() < 0.05 and drops:
        drops[-1] = {"type": "item", "item_id": _pick(_DIAMOND_SCROLLS)}

    # 3% бонус: 10–20 алмазов
    if random.random() < 0.03:
        drops.append({"type": "diamonds", "amount": random.choice([10, 15, 20])})

    return _apply_drops(db, uid, drops)


def _generate_rare_b(db, uid) -> Dict[str, Any]:
    """🟦 Редкий ящик B (50💎) — щедрый: 3–6 алмазных предметов."""
    drops: List[Dict] = []
    count = random.choice([3, 3, 4, 4, 4, 5, 6])  # чаще 4

    for item_id in _pick_n(_DIAMOND_SCROLLS, count):
        drops.append({"type": "item", "item_id": item_id})

    # 5% USDT-свиток (заменяем последний слот)
    if random.random() < 0.05 and drops:
        drops[-1] = {"type": "item", "item_id": _pick(_USDT_SCROLLS)}

    # 3% бонус: +100 алмазов
    if random.random() < 0.03:
        drops.append({"type": "diamonds", "amount": 100})

    # 3% бонус: Premium 3 дня
    if random.random() < 0.03:
        drops.append({"type": "premium", "days": 3})

    return _apply_drops(db, uid, drops)


def _generate_rare_c(db, uid) -> Dict[str, Any]:
    """🟪 Редкий ящик C (80💎) — джекпотный: 2 гарант + 0–4 бонус."""
    drops: List[Dict] = []

    # 2 гарантированных алмазных свитка
    for item_id in _pick_n(_DIAMOND_SCROLLS, 2):
        drops.append({"type": "item", "item_id": item_id})

    # 0–4 бонусных (вероятностный)
    bonus = random.choices([0, 1, 2, 3, 4], weights=[20, 30, 25, 15, 10], k=1)[0]
    for item_id in _pick_n(_DIAMOND_SCROLLS, bonus):
        drops.append({"type": "item", "item_id": item_id})

    # 5% USDT-свиток
    if random.random() < 0.05:
        drops.append({"type": "item", "item_id": _pick(_USDT_SCROLLS)})

    # 5% бонус: +300 алмазов (джекпот!)
    if random.random() < 0.05:
        drops.append({"type": "diamonds", "amount": 300})

    # 3% бонус: Premium 3 дня
    if random.random() < 0.03:
        drops.append({"type": "premium", "days": 3})

    return _apply_drops(db, uid, drops)


def _generate_epic_e2(db, uid) -> Dict[str, Any]:
    """🟣 Эпический E2 ($3) — азартный: USDT-свиток + 2–4 алмазных."""
    drops: List[Dict] = []

    # 1 гарантированный USDT-свиток
    drops.append({"type": "item", "item_id": _pick(_USDT_SCROLLS)})

    # 2–4 алмазных свитка
    count = random.choice([2, 2, 3, 3, 4])
    for item_id in _pick_n(_DIAMOND_SCROLLS, count):
        drops.append({"type": "item", "item_id": item_id})

    # 20% шанс Титана
    if random.random() < 0.20:
        drops.append({"type": "item", "item_id": "scroll_titan"})

    # 8% Premium 7 дней
    if random.random() < 0.08:
        drops.append({"type": "premium", "days": 7})

    # 3% бонус +100 алмазов
    if random.random() < 0.03:
        drops.append({"type": "diamonds", "amount": 100})

    return _apply_drops(db, uid, drops)


def _generate_epic_e3(db, uid) -> Dict[str, Any]:
    """🟣 Эпический E3 ($3) — набор воина: USDT + XP×2 + 2 свитка."""
    drops: List[Dict] = []

    # 1 USDT-свиток (гарант)
    drops.append({"type": "item", "item_id": _pick(_USDT_SCROLLS)})

    # XP Буст ×2 (гарант)
    drops.append({"type": "item", "item_id": "xp_boost_x2"})

    # 1 алмазный свиток (гарант)
    drops.append({"type": "item", "item_id": _pick(_DIAMOND_SCROLLS)})

    # 1 gold-свиток (гарант)
    drops.append({"type": "item", "item_id": _pick(_GOLD_SCROLLS)})

    # 10% шанс Титана
    if random.random() < 0.10:
        drops.append({"type": "item", "item_id": "scroll_titan"})

    # 5% Premium 3 дня
    if random.random() < 0.05:
        drops.append({"type": "premium", "days": 3})

    return _apply_drops(db, uid, drops)


# ── Применение дропов ────────────────────────────────────────────────────────

_BOX_GENERATORS = {
    "box_common":  _generate_common,
    "box_rare":    _generate_rare_b,
    "box_rare_c":  _generate_rare_c,
    "box_epic_e2": _generate_epic_e2,
    "box_epic_e3": _generate_epic_e3,
}

ALL_BOX_IDS = set(_BOX_GENERATORS.keys())


def _apply_drops(db, uid: int, drops: List[Dict]) -> Dict[str, Any]:
    """Выдать все дропы игроку, вернуть результат для фронта."""
    from api.tma_catalogs import SHOP_CATALOG
    from api.tma_player_api import _player_api

    result_items: List[Dict] = []

    for drop in drops:
        if drop["type"] == "item":
            iid = drop["item_id"]
            db.add_to_inventory(uid, iid)
            info = SHOP_CATALOG.get(iid, {})
            result_items.append({
                "item_id": iid,
                "icon": info.get("icon", "🎁"),
                "name": info.get("name", iid),
            })
        elif drop["type"] == "diamonds":
            amt = drop["amount"]
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE players SET diamonds=diamonds+? WHERE user_id=?", (amt, uid))
            conn.commit(); conn.close()
            result_items.append({"item_id": "_diamonds", "icon": "💎", "name": f"+{amt} алмазов"})
        elif drop["type"] == "premium":
            days = drop["days"]
            db.activate_premium(uid, days=days)
            result_items.append({"item_id": "_premium", "icon": "👑", "name": f"Premium {days} дн."})

    player = db.get_or_create_player(uid, "")
    return {
        "ok": True,
        "items": result_items,
        # Совместимость со старым фронтом (первый предмет)
        "item_id":   result_items[0]["item_id"] if result_items else "",
        "item_name": result_items[0]["name"] if result_items else "",
        "item_icon": result_items[0]["icon"] if result_items else "🎁",
        "player": _player_api(dict(player)),
    }


def _open_box_free(box_id: str, db, user_id: int) -> Dict[str, Any]:
    """Открыть ящик из инвентаря (уже оплачен)."""
    gen = _BOX_GENERATORS.get(box_id)
    if not gen:
        return {"ok": False, "reason": "Неизвестный тип ящика"}
    return gen(db, user_id)


def open_box(box_id: str, db, user_id: int) -> Dict[str, Any]:
    """Открыть ящик: списать цену → мульти-дроп."""
    from api.tma_catalogs import SHOP_CATALOG

    box = SHOP_CATALOG.get(box_id)
    if not box:
        return {"ok": False, "reason": "Ящик не найден"}

    currency = box["currency"]
    price = box["price"]

    conn = db.get_connection()
    cursor = conn.cursor()
    col = "gold" if currency == "gold" else "diamonds"
    cursor.execute(f"SELECT {col} FROM players WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    if not row or (row[col] or 0) < price:
        conn.close()
        sym = "🪙" if currency == "gold" else "💎"
        return {"ok": False, "reason": f"Нужно {price} {sym}"}
    cursor.execute(f"UPDATE players SET {col} = {col} - ? WHERE user_id = ?", (price, user_id))
    conn.commit(); conn.close()

    db.track_purchase(user_id, box_id, currency, price)

    gen = _BOX_GENERATORS.get(box_id)
    if not gen:
        return {"ok": False, "reason": "Неизвестный тип ящика"}
    return gen(db, user_id)
