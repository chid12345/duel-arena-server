from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from api.tma_player_api import _player_api


class ShopBuyBody(BaseModel):
    init_data: str
    item_id: str


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

    @router.post("/api/shop/buy")
    async def shop_buy(body: ShopBuyBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "shop_buy", max_hits=5, window_sec=30)

        item = SHOP_CATALOG.get(body.item_id)
        if not item:
            return {"ok": False, "reason": "Товар не найден"}

        if body.item_id == "hp_small":
            result = db.buy_hp_potion_small(uid)
        elif body.item_id == "hp_full":
            result = db.buy_hp_potion(uid)
        elif body.item_id == "xp_boost":
            result = db.buy_xp_boost(uid)
        elif body.item_id == "stat_reset":
            result = db.buy_stat_reset(uid)
        else:
            return {"ok": False, "reason": "Покупка недоступна"}

        if result.get("ok"):
            player = db.get_or_create_player(uid, "")
            result["player"] = _player_api(dict(player))
        return result

    @router.get("/api/shop/packages")
    async def shop_packages():
        return {
            "ok": True,
            "stars": STARS_PACKAGES,
            "crypto": CRYPTO_PACKAGES,
            "premium_stars": PREMIUM_SUBSCRIPTION_STARS,
            "elite_avatar_stars": ELITE_AVATAR_STARS_PACKAGE,
            "elite_avatar_usdt": ELITE_AVATAR_CRYPTO_PACKAGE,
            "cryptopay_enabled": bool(CRYPTOPAY_TOKEN),
        }

    app.include_router(router)
