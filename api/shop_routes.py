"""Магазин: регистрация роутов покупки и применения предметов."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict

_MSK = timedelta(hours=3)  # UTC+3 Moscow

def _today_msk() -> str:
    return (datetime.utcnow() + _MSK).date().isoformat()

def _seconds_until_msk_midnight() -> int:
    now_msk = datetime.utcnow() + _MSK
    from datetime import time as dtime
    next_midnight = datetime.combine(now_msk.date() + timedelta(days=1), dtime.min)
    return max(0, int((next_midnight - now_msk).total_seconds()))

from fastapi import APIRouter

logger = logging.getLogger(__name__)

from api.tma_catalogs import STARS_SCROLL_PACKAGES, USDT_SCROLL_PACKAGES
from api.tma_infra import get_user_lock
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
            from repositories.social.clan_bonus import CLAN_GOLD_BONUS_PCT
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            items = db.get_inventory(uid)
            buffs = db.get_raw_buffs(uid)
            # Сброс счётчика «новых покупок» — игрок открыл инвентарь, всё увидел
            try: db.reset_inventory_unseen(uid)
            except Exception: pass
            # Бонусы клана для отображения в панели оснащения
            clan_bonus = None
            try:
                player = db.get_or_create_player(uid, "")
                clan_id = (player or {}).get("clan_id")
                if clan_id:
                    info = db.get_clan_info(int(clan_id))
                    if info and info.get("clan"):
                        clan_bonus = {
                            "clan_name": info["clan"].get("name", ""),
                            "perks": [
                                {"icon": "💰", "label": "Золото", "value": f"+{CLAN_GOLD_BONUS_PCT}%"},
                            ],
                        }
            except Exception:
                pass
            # eq_stats нужны HTML-оверлею «Герой→Бонусы» как источник истины
            try:
                eq_stats = db.get_equipment_stats(uid)
            except Exception:
                eq_stats = {}
            return {"ok": True, "inventory": items, "active_buffs": buffs,
                    "inventory_unseen": 0, "clan_bonus": clan_bonus, "eq_stats": eq_stats}
        except Exception as exc:
            logger.exception("shop error:")
            return {"ok": False, "reason": f"Ошибка: {type(exc).__name__}: {exc}"}

    @router.post("/api/shop/buy")
    async def shop_buy(body: ShopBuyBody):
        try:
            return await shop_buy_inner(body, **_buy_ctx)
        except Exception as exc:
            logger.exception("shop error:")
            return {"ok": False, "reason": f"Серверная ошибка: {type(exc).__name__}: {exc}"}

    @router.post("/api/shop/apply")
    async def shop_apply(body: ShopApplyBody):
        try:
            return await shop_apply_inner(body, **_buy_ctx)
        except Exception as exc:
            logger.exception("shop error:")
            return {"ok": False, "reason": f"Ошибка: {type(exc).__name__}: {exc}"}

    @router.get("/api/shop/packages")
    async def shop_packages():
        return {
            "ok": True,
            "stars": STARS_PACKAGES,
            "stars_scrolls": STARS_SCROLL_PACKAGES,
            "crypto": CRYPTO_PACKAGES,
            "usdt_scrolls": USDT_SCROLL_PACKAGES,
            "premium_stars": PREMIUM_SUBSCRIPTION_STARS,
            "elite_avatar_stars": ELITE_AVATAR_STARS_PACKAGE,
            "elite_avatar_usdt": ELITE_AVATAR_CRYPTO_PACKAGE,
            "cryptopay_enabled": bool(CRYPTOPAY_TOKEN),
        }

    @router.get("/api/shop/premium_box/status")
    async def premium_box_status(init_data: str):
        """Статус ежедневного ящика для премиум-игрока."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            prem = db.get_premium_status(uid)
            if not prem.get("is_active"):
                return {"ok": True, "is_premium": False, "claimed": False, "seconds_until_reset": 0}
            today = _today_msk()
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT premium_box_claimed FROM players WHERE user_id = ?", (uid,))
            row = cursor.fetchone()
            conn.close()
            claimed_date = (row["premium_box_claimed"] if row else None) or ""
            claimed = str(claimed_date) == today
            return {
                "ok": True,
                "is_premium": True,
                "claimed": claimed,
                "seconds_until_reset": _seconds_until_msk_midnight(),
            }
        except Exception as exc:
            return {"ok": False, "reason": str(exc)}

    @router.post("/api/shop/premium_daily_box")
    async def premium_daily_box(body: ShopBuyBody):
        """Ежедневный ящик для Premium-игроков (1 раз в день, сброс в 00:00 МСК)."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "premium_box", max_hits=2, window_sec=10)
        async with get_user_lock(uid):
            prem = db.get_premium_status(uid)
            if not prem.get("is_active"):
                return {"ok": False, "reason": "Требуется Premium"}
            today = _today_msk()
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE players SET premium_box_claimed = ? "
                "WHERE user_id = ? AND (premium_box_claimed IS NULL OR premium_box_claimed != ?)",
                (today, uid, today),
            )
            rows = cursor.rowcount
            conn.commit()
            conn.close()
            if rows == 0:
                return {"ok": False, "reason": "Ящик уже получен сегодня. Возвращайтесь завтра!"}
            # +10 алмазов ДО открытия ящика — чтобы _apply_drops загрузил игрока с актуальным счётом
            conn2 = db.get_connection()
            cursor2 = conn2.cursor()
            cursor2.execute("UPDATE players SET diamonds = diamonds + 10 WHERE user_id = ?", (uid,))
            conn2.commit()
            conn2.close()
            # Открываем ящик (свитки → инвентарь, _apply_drops загружает игрока уже с +10 💎)
            result = _open_loot_box("box_common", db, uid)
            if "items" not in result:
                result["items"] = []
            result["items"].insert(0, {
                "icon": "💎", "name": "10 алмазов", "desc": "Ежедневный премиум бонус", "item_id": "diamonds_daily"
            })
            result["free"] = True
            result["box_opened"] = True
            result["seconds_until_reset"] = _seconds_until_msk_midnight()
            return result

    app.include_router(router)
