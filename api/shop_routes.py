"""Магазин: покупки, инвентарь, применение свитков, лут-боксы."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from api.tma_catalogs import SCROLL_EFFECTS, USDT_SCROLL_PACKAGES
from api.tma_player_api import _player_api
from api.shop_loot_box import open_box


class ShopBuyBody(BaseModel):
    init_data: str
    item_id: str


class ShopApplyBody(BaseModel):
    init_data: str
    item_id: str
    replace: bool = False  # True → заменить активный свиток


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


def register_shop_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()

    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _rl_check = ctx["_rl_check"]
    PREMIUM_SUBSCRIPTION_STARS = ctx["PREMIUM_SUBSCRIPTION_STARS"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    SHOP_CATALOG = ctx["SHOP_CATALOG"]
    STARS_PACKAGES = ctx["STARS_PACKAGES"]
    CRYPTO_PACKAGES = ctx["CRYPTO_PACKAGES"]
    ELITE_AVATAR_STARS_PACKAGE = ctx["ELITE_AVATAR_STARS_PACKAGE"]
    ELITE_AVATAR_CRYPTO_PACKAGE = ctx["ELITE_AVATAR_CRYPTO_PACKAGE"]

    @router.get("/api/shop/catalog")
    async def shop_catalog():
        return {"ok": True, "items": SHOP_CATALOG}

    @router.get("/api/shop/inventory")
    async def shop_inventory(init_data: str):
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            items = db.get_inventory(uid)
            buffs = db.get_raw_buffs(uid)
            return {"ok": True, "inventory": items, "active_buffs": buffs}
        except Exception as exc:
            import traceback; traceback.print_exc()
            return {"ok": False, "reason": f"Ошибка: {type(exc).__name__}: {exc}"}

    @router.post("/api/shop/buy")
    async def shop_buy(body: ShopBuyBody):
        try:
            return await _shop_buy_inner(body)
        except Exception as exc:
            import traceback; traceback.print_exc()
            return {"ok": False, "reason": f"Серверная ошибка: {type(exc).__name__}: {exc}"}

    async def _shop_buy_inner(body: ShopBuyBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "shop_buy", max_hits=5, window_sec=30)

        item = SHOP_CATALOG.get(body.item_id)
        if not item:
            return {"ok": False, "reason": "Товар не найден"}

        iid = body.item_id

        # === HP зелья (сразу) ===
        if iid == "hp_small":
            return _buy_hp(db, uid, price=12, pct=0.30)
        if iid == "hp_medium":
            return _buy_hp(db, uid, price=25, pct=0.60)
        if iid == "hp_full":
            return _buy_hp(db, uid, price=50, pct=1.0)

        # === Сброс статов (сразу) ===
        if iid == "stat_reset":
            return _finalize(db, uid, db.buy_stat_reset(uid))

        # === XP бусты → в инвентарь (используются как xp_boost_charges) ===
        if iid in _XP_BOOST_CHARGES:
            charges, mult = _XP_BOOST_CHARGES[iid]
            return _buy_xp_boost_item(db, uid, iid, charges, mult)

        # === Обмен алмазы → золото ===
        if iid in _EXCHANGE_GOLD:
            cost_d, gold_gain = _EXCHANGE_GOLD[iid]
            return _exchange_diamonds(db, uid, cost_d, gold_gain)

        # === Лут-боксы ===
        if iid in ("box_common", "box_rare"):
            result = open_box(iid, db, uid)
            return result

        # === Золото за охоту → в инвентарь ===
        if iid == "gold_hunt":
            return _buy_to_inventory(db, uid, iid, price=20, currency="diamonds")

        # === Свитки → в инвентарь ===
        if item.get("inventory") and iid.startswith("scroll_"):
            return _buy_to_inventory(db, uid, iid, item["price"], item["currency"])

        return {"ok": False, "reason": "Покупка недоступна"}

    @router.post("/api/shop/apply")
    async def shop_apply(body: ShopApplyBody):
        """Применить предмет из инвентаря."""
        try:
            return await _shop_apply_inner(body)
        except Exception as exc:
            import traceback; traceback.print_exc()
            return {"ok": False, "reason": f"Ошибка: {type(exc).__name__}: {exc}"}

    async def _shop_apply_inner(body: ShopApplyBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "shop_apply", max_hits=10, window_sec=60)

        iid = body.item_id

        # XP буст: перевести из инвентаря в xp_boost_charges
        if iid in _XP_BOOST_CHARGES:
            if not db.has_item(uid, iid):
                return {"ok": False, "reason": "Предмет не найден в инвентаре"}
            charges, mult = _XP_BOOST_CHARGES[iid]
            db.remove_from_inventory(uid, iid)
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE players SET xp_boost_charges = xp_boost_charges + ? WHERE user_id = ?",
                (charges, uid),
            )
            conn.commit()
            conn.close()
            player = db.get_or_create_player(uid, "")
            return {"ok": True, "msg": f"⚡ XP Буст активирован — {charges} зарядов!", "player": _player_api(dict(player))}

        # gold_hunt: добавить time-based баф (только если нет активного)
        if iid == "gold_hunt":
            if not db.has_item(uid, iid):
                return {"ok": False, "reason": "Предмет не найден в инвентаре"}
            existing_gold = next(
                (b for b in db.get_raw_buffs(uid) if b["buff_type"] == "gold_pct"), None
            )
            if existing_gold:
                return {"ok": False, "reason": "Охота за золотом уже активна! Дождитесь окончания."}
            db.remove_from_inventory(uid, iid)
            db.add_buff(uid, "gold_pct", 20, hours=24)
            player = db.get_or_create_player(uid, "")
            return {"ok": True, "msg": "💰 Охота за золотом активирована на 24 ч!", "player": _player_api(dict(player))}

        # Ящики из инвентаря (открываются без списания валюты — уже куплены)
        if iid in ("box_common", "box_rare", "box_epic"):
            if not db.has_item(uid, iid):
                return {"ok": False, "reason": "Предмет не найден в инвентаре"}
            db.remove_from_inventory(uid, iid)
            from api.shop_loot_box import _open_box_free
            result = _open_box_free(iid, db, uid)
            result["box_opened"] = True
            return result

        # Свитки
        effects = SCROLL_EFFECTS.get(iid)
        if effects:
            if not db.has_item(uid, iid):
                return {"ok": False, "reason": "Предмет не найден в инвентаре"}
            result = db.apply_scroll_buffs(uid, effects, replace=body.replace)
            if not result["ok"]:
                # Конфликт — вернуть информацию для диалога
                active = result.get("active_buff", {})
                return {
                    "ok": False,
                    "conflict": True,
                    "active_buff_type": active.get("buff_type"),
                    "active_charges": active.get("charges"),
                    "reason": "Уже есть активный свиток. Заменить?",
                }
            db.remove_from_inventory(uid, iid)
            item_info = SHOP_CATALOG.get(iid, {})
            player = db.get_or_create_player(uid, "")
            return {
                "ok": True,
                "msg": f"✅ {item_info.get('icon', '')} {item_info.get('name', iid)} применён!",
                "active_buffs": db.get_raw_buffs(uid),
                "player": _player_api(dict(player)),
            }

        return {"ok": False, "reason": "Нельзя применить этот предмет"}

    @router.get("/api/shop/packages")
    async def shop_packages():
        return {
            "ok": True,
            "stars": STARS_PACKAGES,
            "crypto": CRYPTO_PACKAGES,
            "usdt_scrolls": USDT_SCROLL_PACKAGES,
            "premium_stars": PREMIUM_SUBSCRIPTION_STARS,
            "elite_avatar_stars": ELITE_AVATAR_STARS_PACKAGE,
            "elite_avatar_usdt": ELITE_AVATAR_CRYPTO_PACKAGE,
            "cryptopay_enabled": bool(CRYPTOPAY_TOKEN),
        }

    @router.post("/api/shop/premium_daily_box")
    async def premium_daily_box(body: ShopBuyBody):
        """Бесплатный ящик для Premium-игроков (1 раз в день)."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        prem = db.get_premium_status(uid)
        if not prem.get("is_active"):
            return {"ok": False, "reason": "Требуется Premium"}
        # Проверяем premium_box_claimed
        today = datetime.utcnow().date().isoformat()
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT premium_box_claimed FROM players WHERE user_id = ?", (uid,))
        row = cursor.fetchone()
        conn.close()
        if row and row["premium_box_claimed"] == today:
            return {"ok": False, "reason": "Ящик уже получен сегодня. Возвращайтесь завтра!"}
        # Обновить дату и открыть ящик
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE players SET premium_box_claimed = ? WHERE user_id = ?", (today, uid))
        conn.commit()
        conn.close()
        db.add_to_inventory(uid, "box_common")
        result = open_box("box_common", db, uid)
        result["free"] = True
        return result

    app.include_router(router)


# ── Вспомогательные функции ────────────────────────────────────────────────

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
    if (row["gold"] or 0) < price:
        conn.close()
        return {"ok": False, "reason": f"Нужно {price} 🪙 золота"}
    max_hp = int(row["max_hp"] or 100)
    cur_hp = int(row["current_hp"]) if row["current_hp"] is not None else max_hp
    if cur_hp >= max_hp:
        conn.close()
        return {"ok": False, "reason": "HP уже полное!"}
    if pct >= 1.0:
        new_hp = max_hp
    else:
        new_hp = min(max_hp, cur_hp + max(1, int(max_hp * pct)))
    cursor.execute(
        "UPDATE players SET gold = gold - ?, current_hp = ?, last_hp_regen = ? WHERE user_id = ?",
        (price, new_hp, datetime.utcnow().isoformat(), uid),
    )
    conn.commit()
    conn.close()
    player = db.get_or_create_player(uid, "")
    return {"ok": True, "hp_restored": new_hp - cur_hp, "new_hp": new_hp, "max_hp": max_hp,
            "player": _player_api(dict(player))}


def _buy_to_inventory(db, uid: int, item_id: str, price: int, currency: str) -> dict:
    conn = db.get_connection()
    cursor = conn.cursor()
    if currency == "gold":
        cursor.execute("SELECT gold FROM players WHERE user_id = ?", (uid,))
        row = cursor.fetchone()
        if not row or (row["gold"] or 0) < price:
            conn.close()
            return {"ok": False, "reason": f"Нужно {price} 🪙 золота"}
        cursor.execute("UPDATE players SET gold = gold - ? WHERE user_id = ?", (price, uid))
    else:
        cursor.execute("SELECT diamonds FROM players WHERE user_id = ?", (uid,))
        row = cursor.fetchone()
        if not row or (row["diamonds"] or 0) < price:
            conn.close()
            return {"ok": False, "reason": f"Нужно {price} 💎 алмазов"}
        cursor.execute("UPDATE players SET diamonds = diamonds - ? WHERE user_id = ?", (price, uid))
    conn.commit()
    conn.close()
    db.add_to_inventory(uid, item_id)
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
    if currency == "gold":
        cursor.execute("SELECT gold FROM players WHERE user_id = ?", (uid,))
        row = cursor.fetchone()
        if not row or (row["gold"] or 0) < price:
            conn.close()
            return {"ok": False, "reason": f"Нужно {price} 🪙 золота"}
        cursor.execute("UPDATE players SET gold = gold - ? WHERE user_id = ?", (price, uid))
    else:
        cursor.execute("SELECT diamonds FROM players WHERE user_id = ?", (uid,))
        row = cursor.fetchone()
        if not row or (row["diamonds"] or 0) < price:
            conn.close()
            return {"ok": False, "reason": f"Нужно {price} 💎 алмазов"}
        cursor.execute("UPDATE players SET diamonds = diamonds - ? WHERE user_id = ?", (price, uid))
    conn.commit()
    conn.close()
    db.add_to_inventory(uid, item_id)
    player = db.get_or_create_player(uid, "")
    return {"ok": True, "added_to_inventory": True, "item_id": item_id,
            "charges": charges, "player": _player_api(dict(player))}


def _exchange_diamonds(db, uid: int, cost_diamonds: int, gold_gain: int) -> dict:
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT diamonds FROM players WHERE user_id = ?", (uid,))
    row = cursor.fetchone()
    if not row or (row["diamonds"] or 0) < cost_diamonds:
        conn.close()
        return {"ok": False, "reason": f"Нужно {cost_diamonds} 💎 алмазов"}
    cursor.execute(
        "UPDATE players SET diamonds = diamonds - ?, gold = gold + ? WHERE user_id = ?",
        (cost_diamonds, gold_gain, uid),
    )
    conn.commit()
    conn.close()
    player = db.get_or_create_player(uid, "")
    return {"ok": True, "gold_gained": gold_gain, "player": _player_api(dict(player))}
