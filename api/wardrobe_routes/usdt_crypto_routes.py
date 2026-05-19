"""Crypto-маршруты Легендарной брони (armor_mythic4): покупка $11.99 и сброс $5.99 через CryptoPay.

Унификация armor: все ручки работают с armor_custom_mods (не user_inventory).
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict

from fastapi import APIRouter

import httpx

from api.wardrobe_routes.models import InitDataHeader

logger = logging.getLogger(__name__)


def attach_wardrobe_usdt_crypto(
    router: APIRouter,
    ctx: Dict[str, Any],
    player_response_fn: Callable[[int], dict],
) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _cache_invalidate = ctx["_cache_invalidate"]
    CRYPTOPAY_TOKEN = ctx.get("CRYPTOPAY_TOKEN", "")
    CRYPTOPAY_API_BASE = ctx.get("CRYPTOPAY_API_BASE", "https://pay.crypt.bot/api")

    async def _create_cryptopay_invoice(uid: int, amount: str, description: str, payload_str: str):
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{CRYPTOPAY_API_BASE}/createInvoice",
                headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                json={
                    "asset": "USDT",
                    "amount": amount,
                    "payload": payload_str,
                    "description": description,
                    "allow_comments": False,
                    "allow_anonymous": False,
                },
            )
            data = resp.json()
        if data.get("ok"):
            inv = data["result"]
            db.create_crypto_invoice(uid, inv["invoice_id"], 0, "USDT", amount, payload=payload_str)
            return {
                "ok": True,
                "invoice_url": inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url") or inv.get("web_app_invoice_url"),
                "web_app_url": inv.get("web_app_invoice_url"),
                "invoice_id": inv["invoice_id"],
            }
        err = data.get("error") or {}
        return {"ok": False, "reason": f"CryptoPay [{err.get('code','?')}] {err.get('name','UNKNOWN')}"}

    @router.post("/api/wardrobe/usdt/buy-invoice")
    async def wardrobe_usdt_buy_invoice(body: InitDataHeader):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            db.get_or_create_player(uid, tg_user.get("username") or tg_user.get("first_name") or "")
            return await _create_cryptopay_invoice(
                uid,
                amount="11.99",
                description="Duel Arena — Легендарная броня (кастомный слот)",
                payload_str=f"uid:{uid}:usdt_slot:1",
            )
        except Exception as e:
            logger.error("usdt buy-invoice: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}

    @router.post("/api/wardrobe/usdt/buy-invoice-stars")
    async def wardrobe_usdt_buy_invoice_stars(body: InitDataHeader):
        """Telegram Stars-инвойс на 590⭐ для Легендарной брони (armor_mythic4).

        Stars — реальные деньги Telegram, эквивалент ~$11.99. После оплаты
        handle_stars_equip_payload обработает payload `armor_class_stars:
        legendary_usdt` → create_legendary_armor → у игрока появится
        armor_custom_mods с free_stats_left=19, можно распределять статы.
        """
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            db.get_or_create_player(uid, tg_user.get("username") or tg_user.get("first_name") or "")
            BOT_TOKEN = ctx.get("BOT_TOKEN", "")
            if not BOT_TOKEN:
                return {"ok": False, "reason": "Бот не настроен"}
            payload = f"armor_class_stars:{uid}:legendary_usdt"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                    json={
                        "title": "Легендарная броня",
                        "description": "Доспех Светоносного Бога — +19 свободных статов и выбор пассивки",
                        "payload": payload,
                        "currency": "XTR",
                        "prices": [{"label": "Легендарная броня", "amount": 800}],
                    },
                )
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"]}
            logger.error("legendary stars invoice error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("legendary stars invoice: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}

    @router.post("/api/wardrobe/usdt/reset-invoice")
    async def wardrobe_usdt_reset_invoice(body: InitDataHeader):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            if not db.has_legendary_armor(uid):
                return {"ok": False, "reason": "Легендарный слот не создан"}
            return await _create_cryptopay_invoice(
                uid,
                amount="5.99",
                description="Duel Arena — сброс статов Легендарной брони",
                payload_str=f"uid:{uid}:usdt_reset:armor_mythic4",
            )
        except Exception as e:
            logger.error("usdt reset-invoice: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}

    @router.get("/api/wardrobe/usdt/check-reset")
    async def wardrobe_usdt_check_reset(init_data: str, invoice_id: int):
        """Проверить оплату сброса напрямую у CryptoPay и применить сброс."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            if not CRYPTOPAY_TOKEN:
                return {"ok": False, "reason": "CryptoPay не настроен"}
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{CRYPTOPAY_API_BASE}/getInvoices",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    params={"invoice_ids": str(invoice_id)},
                )
                data = resp.json()
            items = (data.get("result") or {}).get("items") or []
            if not items:
                return {"ok": False, "reason": "Счёт не найден"}
            status = items[0].get("status", "")
            if status != "paid":
                return {"ok": False, "reason": f"Счёт ещё не оплачен (статус: {status})"}
            db.confirm_crypto_invoice(invoice_id)
            ok, msg = db.reset_legendary(uid)
            if ok:
                _cache_invalidate(uid)
                mods = db.get_armor_custom_mods(uid, "armor_mythic4")
                return {"ok": True, "reset_applied": True, "armor_mods": mods,
                        "player": player_response_fn(uid)}
            return {"ok": False, "reason": msg}
        except Exception as e:
            logger.error("usdt check-reset: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}
