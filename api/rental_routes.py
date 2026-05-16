"""Маршруты аренды mythic-снаряжения за Stars (Этап 8 редизайна).

POST /api/rental/stars_invoice — создаёт Stars-инвойс на аренду 7 дней
GET  /api/rental/list — активные аренды игрока (для UI бейджа)

Выдача аренды происходит в handlers/commands/shop_equip_stars.py
по payload `rental_stars:{uid}:{item_id}` — единая точка для всех Stars-эквипов.
"""
from __future__ import annotations

import logging

import httpx
from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _rl_check
from api.tma_models import InitDataHeader
from config import BOT_TOKEN
from database import db
from db_schema.equipment_catalog import get_item
from economy.rental_pricing import (
    RENTAL_DURATION_DAYS,
    rental_stars_price,
)

logger = logging.getLogger(__name__)


class _RentBody(InitDataHeader):
    item_id: str


def register_rental_routes(app: FastAPI) -> None:

    @app.post("/api/rental/stars_invoice")
    async def rental_stars_invoice(body: _RentBody):
        """Создать Stars-инвойс на аренду mythic-предмета на 7 дней."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "rental", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Аренда доступна только для мифических предметов"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}

        full_stars = int(item.get("price_stars", 0))
        if full_stars <= 0:
            return {"ok": False, "reason": "Нет звёздной цены — аренда невозможна"}
        stars = rental_stars_price(full_stars)
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
