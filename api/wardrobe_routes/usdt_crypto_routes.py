"""Crypto-маршруты USDT-образов: создание/проверка инвойсов CryptoPay."""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable, Dict

from fastapi import APIRouter

import httpx

from api.wardrobe_routes.models import (
    InitDataHeader,
    USDTBuyInvoiceBody,
    USDTResetInvoiceBody,
)

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
                "invoice_url": inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url"),
                "invoice_id": inv["invoice_id"],
            }
        err = data.get("error") or {}
        return {"ok": False, "reason": f"CryptoPay [{err.get('code','?')}] {err.get('name','UNKNOWN')}"}

    @router.post("/api/wardrobe/usdt/buy-invoice")
    async def wardrobe_usdt_buy_invoice(body: USDTBuyInvoiceBody):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            db.get_or_create_player(uid, tg_user.get("username") or tg_user.get("first_name") or "")
            return await _create_cryptopay_invoice(
                uid,
                amount="11.99",
                description="Duel Arena — USDT-образ (кастомный слот)",
                payload_str=f"uid:{uid}:usdt_slot:1",
            )
        except Exception as e:
            logger.error("usdt buy-invoice: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}

    @router.post("/api/wardrobe/usdt/reset-invoice")
    async def wardrobe_usdt_reset_invoice(body: USDTResetInvoiceBody):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            class_id = body.class_id.strip()
            if not db.has_class(uid, class_id):
                return {"ok": False, "reason": "USDT-образ не найден"}
            return await _create_cryptopay_invoice(
                uid,
                amount="5.99",
                description="Duel Arena — сброс статов USDT-образа",
                payload_str=f"uid:{uid}:usdt_reset:{class_id}",
            )
        except Exception as e:
            logger.error("usdt reset-invoice: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}

    @router.get("/api/wardrobe/usdt/check-reset")
    async def wardrobe_usdt_check_reset(init_data: str, class_id: str, invoice_id: int):
        """Проверить оплату сброса напрямую у CryptoPay и применить сброс."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            cid = class_id.strip()
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
            ok, msg = db.reset_usdt_slot_stats(uid, cid)
            if ok:
                _cache_invalidate(uid)
                inventory = db.get_user_inventory(uid)
                inv_item = next((i for i in inventory if i["class_id"] == cid), None)
                return {"ok": True, "reset_applied": True, "inventory_item": inv_item,
                        "player": player_response_fn(uid)}
            return {"ok": False, "reason": msg}
        except Exception as e:
            logger.error("usdt check-reset: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}
