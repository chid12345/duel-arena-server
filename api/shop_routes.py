"""Магазин: регистрация роутов покупки и применения предметов."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter

from api.tma_catalogs import USDT_SCROLL_PACKAGES
from api.shop_loot_box import _open_box_free as _open_loot_box
from api.tma_models import ShopBuyBody, ShopApplyBody
from api.shop_buy_handler import shop_buy_inner
from api.shop_apply_handler import shop_apply_inner


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

    _buy_ctx = dict(
        db=db,
        get_user_from_init_data=get_user_from_init_data,
        _rl_check=_rl_check,
        SHOP_CATALOG=SHOP_CATALOG,
    )

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
            return await shop_buy_inner(body, **_buy_ctx)
        except Exception as exc:
            import traceback; traceback.print_exc()
            return {"ok": False, "reason": f"Серверная ошибка: {type(exc).__name__}: {exc}"}

    @router.post("/api/shop/apply")
    async def shop_apply(body: ShopApplyBody):
        try:
            return await shop_apply_inner(body, **_buy_ctx)
        except Exception as exc:
            import traceback; traceback.print_exc()
            return {"ok": False, "reason": f"Ошибка: {type(exc).__name__}: {exc}"}

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
        today = datetime.utcnow().date().isoformat()
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT premium_box_claimed FROM players WHERE user_id = ?", (uid,))
        row = cursor.fetchone()
        conn.close()
        if row and row["premium_box_claimed"] == today:
            return {"ok": False, "reason": "Ящик уже получен сегодня. Возвращайтесь завтра!"}
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE players SET premium_box_claimed = ? WHERE user_id = ?", (today, uid))
        conn.commit()
        conn.close()
        result = _open_loot_box("box_common", db, uid)
        result["free"] = True
        result["box_opened"] = True
        return result

    app.include_router(router)
