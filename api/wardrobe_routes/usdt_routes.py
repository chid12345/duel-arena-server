"""USDT-образы и стоимость сброса статов."""

from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable, Dict

from fastapi import APIRouter

import httpx

from api.wardrobe_routes.models import (
    InitDataHeader,
    USDTBody,
    USDTBuyInvoiceBody,
    USDTNameBody,
    USDTPassiveBody,
    USDTResetInvoiceBody,
    USDTTrainBody,
)

logger = logging.getLogger(__name__)


def attach_wardrobe_usdt(
    router: APIRouter,
    ctx: Dict[str, Any],
    wardrobe: Callable[..., Awaitable[dict]],
) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _cache_invalidate = ctx["_cache_invalidate"]
    RESET_STATS_COST_DIAMONDS = ctx["RESET_STATS_COST_DIAMONDS"]
    RESET_STATS_COST_DIAMONDS_USDT = ctx["RESET_STATS_COST_DIAMONDS_USDT"]
    CRYPTOPAY_TOKEN = ctx.get("CRYPTOPAY_TOKEN", "")
    CRYPTOPAY_API_BASE = ctx.get("CRYPTOPAY_API_BASE", "https://pay.crypt.bot/api")

    @router.post("/api/wardrobe/usdt/create")
    async def wardrobe_usdt_create(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message, new_class_id = db.create_usdt_class(uid)
        result = {"ok": success, "message": message, "new_class_id": new_class_id}
        if success:
            _cache_invalidate(uid)
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/usdt/save")
    async def wardrobe_usdt_save(body: USDTBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        username = tg_user.get("username") or tg_user.get("first_name") or ""
        db.get_or_create_player(uid, username)
        success, message = db.save_usdt_stats(uid, body.class_id.strip())
        result = {"ok": success, "message": message}
        if success:
            result.update(await wardrobe(body.init_data))
        return result

    @router.post("/api/wardrobe/usdt/rename")
    async def wardrobe_usdt_rename(body: USDTNameBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        inventory = db.get_user_inventory(uid)
        usdt_item = next((item for item in inventory if item["class_id"] == body.class_id), None)
        if not usdt_item or usdt_item["class_type"] != "usdt":
            return {"ok": False, "message": "USDT-образ не найден"}
        conn = db.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE user_inventory SET custom_name = ? WHERE user_id = ? AND class_id = ?",
                (body.custom_name.strip()[:50], uid, body.class_id),
            )
            conn.commit()
            result = {"ok": True, "message": "Название обновлено"}
            result.update(await wardrobe(body.init_data))
            return result
        except Exception as e:
            conn.rollback()
            logger.error("usdt rename failed: %s", e)
            return {"ok": False, "message": f"Ошибка: {str(e)}"}
        finally:
            conn.close()

    @router.get("/api/wardrobe/reset-cost")
    async def wardrobe_reset_cost(init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        cost = db.get_reset_stats_cost(uid)
        has_usdt = any(item["class_type"] == "usdt" for item in db.get_user_inventory(uid))
        return {
            "ok": True,
            "cost_diamonds": cost,
            "has_usdt_discount": has_usdt,
            "regular_cost": RESET_STATS_COST_DIAMONDS,
            "discounted_cost": RESET_STATS_COST_DIAMONDS_USDT,
        }

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

    def _player_response(uid: int) -> dict:
        p = dict(db.get_or_create_player(uid, ""))
        usdt_passive = db.get_equipped_usdt_passive(uid)
        if usdt_passive:
            p["usdt_passive_type"] = usdt_passive
        return _player_api(p)

    @router.post("/api/wardrobe/usdt/apply-stats")
    async def wardrobe_usdt_apply_stats(body: USDTBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = db.apply_usdt_stats(uid, body.class_id.strip())
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "inventory_item": item, "player": _player_response(uid)}
        return {"ok": False, "message": msg, "inventory_item": item}

    @router.post("/api/wardrobe/usdt/train")
    async def wardrobe_usdt_train(body: USDTTrainBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = db.train_usdt_stat(uid, body.class_id.strip(), body.stat.strip())
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "inventory_item": item, "player": _player_response(uid)}
        return {"ok": False, "message": msg, "inventory_item": item}

    @router.post("/api/wardrobe/usdt/untrain")
    async def wardrobe_usdt_untrain(body: USDTTrainBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = db.untrain_usdt_stat(uid, body.class_id.strip(), body.stat.strip())
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "inventory_item": item, "player": _player_response(uid)}
        return {"ok": False, "message": msg, "inventory_item": item}

    @router.post("/api/wardrobe/usdt/set-passive")
    async def wardrobe_usdt_set_passive(body: USDTPassiveBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, item = db.set_usdt_passive(uid, body.class_id.strip(), body.passive_type)
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "inventory_item": item, "player": _player_response(uid)}
        return {"ok": False, "message": msg, "inventory_item": item}

    @router.post("/api/wardrobe/usdt/reset-invoice")
    async def wardrobe_usdt_reset_invoice(body: USDTResetInvoiceBody):
        try:
            tg_user = get_user_from_init_data(body.init_data)
            uid = int(tg_user["id"])
            class_id = body.class_id.strip()
            if not db.has_class(uid, class_id):
                return {"ok": False, "reason": "USDT-образ не найден"}
            result = await _create_cryptopay_invoice(
                uid,
                amount="5.99",
                description="Duel Arena — сброс статов USDT-образа",
                payload_str=f"uid:{uid}:usdt_reset:{class_id}",
            )
            return result  # содержит ok, invoice_url, invoice_id
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
            # Счёт оплачен — подтвердить (игнорируем already_paid, сброс всё равно применяем)
            db.confirm_crypto_invoice(invoice_id)
            ok, msg = db.reset_usdt_slot_stats(uid, cid)
            if ok:
                _cache_invalidate(uid)
                inventory = db.get_user_inventory(uid)
                inv_item = next((i for i in inventory if i["class_id"] == cid), None)
                return {"ok": True, "reset_applied": True, "inventory_item": inv_item, "player": _player_response(uid)}
            return {"ok": False, "reason": msg}
        except Exception as e:
            logger.error("usdt check-reset: %s", e, exc_info=True)
            return {"ok": False, "reason": str(e)[:120]}
