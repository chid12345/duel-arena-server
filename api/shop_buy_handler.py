"""Логика обработки покупки товаров магазина."""

from __future__ import annotations

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

    # === XP бусты → в инвентарь ===
    if iid in _XP_BOOST_CHARGES:
        charges, mult = _XP_BOOST_CHARGES[iid]
        return _buy_xp_boost_item(db, uid, iid, charges, mult)

    # === Обмен алмазы → золото ===
    if iid in _EXCHANGE_GOLD:
        cost_d, gold_gain = _EXCHANGE_GOLD[iid]
        return _exchange_diamonds(db, uid, cost_d, gold_gain)

    # === Лут-боксы → в инвентарь ===
    if iid in ("box_common", "box_rare"):
        return _buy_to_inventory(db, uid, iid, item["price"], item["currency"])

    # === Золото за охоту → в инвентарь ===
    if iid == "gold_hunt":
        return _buy_to_inventory(db, uid, iid, price=20, currency="diamonds")

    # === Свитки → в инвентарь ===
    if item.get("inventory") and iid.startswith("scroll_"):
        return _buy_to_inventory(db, uid, iid, item["price"], item["currency"])

    return {"ok": False, "reason": "Покупка недоступна"}
