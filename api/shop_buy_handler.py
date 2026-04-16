"""Логика обработки покупки товаров магазина."""

from __future__ import annotations

from api.tma_infra import get_user_lock
from api.shop_helpers import (
    _XP_BOOST_CHARGES,
    _EXCHANGE_GOLD,
    _buy_hp,
    _finalize,
    _buy_xp_boost_item,
    _exchange_diamonds,
    _buy_to_inventory,
)


async def shop_buy_inner(body, *, db, get_user_from_init_data, _rl_check, SHOP_CATALOG) -> dict:
    tg_user = get_user_from_init_data(body.init_data)
    uid = int(tg_user["id"])
    _rl_check(uid, "shop_buy", max_hits=2, window_sec=3)

    item = SHOP_CATALOG.get(body.item_id)
    if not item:
        return {"ok": False, "reason": "Товар не найден"}

    # Per-user lock: два параллельных запроса не списывают валюту одновременно
    async with get_user_lock(uid):
        return _do_buy(db, uid, body.item_id, item)


def _do_buy(db, uid: int, iid: str, item: dict) -> dict:
    # === HP зелья (сразу) ===
    if iid == "hp_small":
        r = _buy_hp(db, uid, price=12, pct=0.30)
        if r.get("ok"):
            db.track_purchase(uid, iid, "gold", 12)
            db.track_item_use(uid, iid)
        return r
    if iid == "hp_medium":
        r = _buy_hp(db, uid, price=25, pct=0.60)
        if r.get("ok"):
            db.track_purchase(uid, iid, "gold", 25)
            db.track_item_use(uid, iid)
        return r
    if iid == "hp_full":
        r = _buy_hp(db, uid, price=50, pct=1.0)
        if r.get("ok"):
            db.track_purchase(uid, iid, "gold", 50)
            db.track_item_use(uid, iid)
        return r

    # === Сброс статов (сразу) ===
    if iid == "stat_reset":
        r = _finalize(db, uid, db.buy_stat_reset(uid))
        if r.get("ok"): db.track_purchase(uid, iid, "gold", item.get("price", 0))
        return r

    # === XP бусты → в инвентарь ===
    if iid in _XP_BOOST_CHARGES:
        charges, mult = _XP_BOOST_CHARGES[iid]
        r = _buy_xp_boost_item(db, uid, iid, charges, mult)
        if r.get("ok"): db.track_purchase(uid, iid, item["currency"], item["price"])
        return r

    # === Обмен алмазы → золото ===
    if iid in _EXCHANGE_GOLD:
        cost_d, gold_gain = _EXCHANGE_GOLD[iid]
        r = _exchange_diamonds(db, uid, cost_d, gold_gain)
        if r.get("ok"): db.track_purchase(uid, iid, "diamonds", cost_d)
        return r

    # === Лут-боксы → в инвентарь ===
    if iid in ("box_common", "box_rare", "box_rare_c"):
        r = _buy_to_inventory(db, uid, iid, item["price"], item["currency"])
        if r.get("ok"): db.track_purchase(uid, iid, item["currency"], item["price"])
        return r

    # === Охоты (золото/опыт) → в инвентарь ===
    if iid in ("gold_hunt", "xp_hunt"):
        r = _buy_to_inventory(db, uid, iid, price=20, currency="diamonds")
        if r.get("ok"): db.track_purchase(uid, iid, "diamonds", 20)
        return r

    # === Свитки → в инвентарь ===
    if item.get("inventory") and iid.startswith("scroll_"):
        r = _buy_to_inventory(db, uid, iid, item["price"], item["currency"])
        if r.get("ok"): db.track_purchase(uid, iid, item["currency"], item["price"])
        return r

    return {"ok": False, "reason": "Покупка недоступна"}
