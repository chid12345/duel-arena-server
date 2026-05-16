"""Маршруты аренды mythic-снаряжения за Stars/USDT (Этап 8 редизайна).

POST /api/rental/stars_invoice  — Stars-инвойс на аренду 7 дней (фикс 100⭐)
POST /api/rental/crypto_invoice — USDT-инвойс на аренду 7 дней (фикс $2)
GET  /api/rental/list           — активные аренды игрока (для UI бейджа)

Выдача аренды:
- Stars → handlers/commands/shop_equip_stars.py (payload `rental_stars:{uid}:{item_id}`)
- USDT  → api/payment_routes/crypto_{webhook,check}.py + recover_crypto_invoice.py
  (payload `uid:{uid}:rental:{item_id}` — три пути доставки по правилу проекта)
"""
from __future__ import annotations

import logging

import httpx
from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_catalogs import CRYPTOPAY_API_BASE
from api.tma_infra import _rl_check
from api.tma_models import InitDataHeader
from config import BOT_TOKEN, CRYPTOPAY_TOKEN
from database import db
from db_schema.equipment_catalog import get_item
from economy.rental_pricing import (
    RENTAL_DURATION_DAYS,
    RENTAL_PRICE_STARS,
    RENTAL_PRICE_USDT,
)

logger = logging.getLogger(__name__)


class _RentBody(InitDataHeader):
    item_id: str


def register_rental_routes(app: FastAPI) -> None:

    @app.post("/api/rental/stars_invoice")
    async def rental_stars_invoice(body: _RentBody):
        """Stars-инвойс на аренду mythic на 7 дней (фикс 100⭐)."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "rental", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Аренда доступна только для мифических предметов"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}

        stars = RENTAL_PRICE_STARS
        title = f"🕐 Аренда: {item['name']}"
        desc = f"{item['name']} на {RENTAL_DURATION_DAYS} дн. ({item.get('desc', '')})"
        payload = f"rental_stars:{uid}:{body.item_id}"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                    json={
                        "title": title,
                        "description": desc,
                        "payload": payload,
                        "currency": "XTR",
                        "prices": [{"label": title, "amount": stars}],
                    },
                )
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"], "stars": stars}
            logger.error("Stars rental invoice error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars rental invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/rental/crypto_invoice")
    async def rental_crypto_invoice(body: _RentBody):
        """USDT-инвойс на аренду mythic на 7 дней (фикс $2)."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "rental", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Аренда доступна только для мифических предметов"}
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

        description = f"Duel Arena — аренда {RENTAL_DURATION_DAYS} дн.: {item['name']}"
        payload_str = f"uid:{uid}:rental:{body.item_id}"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{CRYPTOPAY_API_BASE}/createInvoice",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    json={
                        "asset": "USDT",
                        "amount": RENTAL_PRICE_USDT,
                        "payload": payload_str,
                        "description": description,
                        "allow_comments": False,
                        "allow_anonymous": False,
                    },
                )
                data = resp.json()
            if data.get("ok"):
                inv = data["result"]
                db.create_crypto_invoice(
                    uid, inv["invoice_id"], 0, "USDT", RENTAL_PRICE_USDT, payload=payload_str
                )
                url = inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url") or inv.get("web_app_invoice_url")
                return {
                    "ok": True,
                    "invoice_url": url,
                    "web_app_url": inv.get("web_app_invoice_url"),
                    "invoice_id": inv["invoice_id"],
                    "usdt": RENTAL_PRICE_USDT,
                }
            err = data.get("error") or {}
            return {"ok": False, "reason": f"CryptoPay [{err.get('code','?')}] {err.get('name','UNKNOWN')}"}
        except Exception as e:
            logger.error("CryptoPay rental invoice error: %s", e)
            return {"ok": False, "reason": f"Ошибка соединения: {e}"}

    @app.get("/api/rental/list")
    def rental_list(init_data: str):
        """Список активных аренд (для UI бейджа «🕐 ещё N дн.»)."""
        try:
            tg_user = get_user_from_init_data(init_data)
            uid = int(tg_user["id"])
            return {"ok": True, "rentals": db.list_active_rentals(uid)}
        except Exception as e:
            logger.error("rental_list error: %s", e)
            return {"ok": False, "reason": "Ошибка сервера"}
