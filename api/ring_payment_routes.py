"""Маршруты оплаты мифических колец за Stars."""
from __future__ import annotations

import logging

import httpx
from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_infra import _rl_check, _cache_invalidate
from api.tma_models import InitDataHeader
from api.tma_player_api import _player_api
from config import BOT_TOKEN
from database import db
from db_schema.equipment_catalog import get_item

logger = logging.getLogger(__name__)


class _RingPayBody(InitDataHeader):
    item_id: str


def _eq_response(uid: int) -> dict:
    try:
        eq_raw = db.get_equipment(uid)
        return {
            slot: {"item_id": it["item_id"], "name": it["name"], "emoji": it["emoji"],
                   "rarity": it["rarity"], "desc": it.get("desc", "")}
            for slot, it in eq_raw.items()
        }
    except Exception:
        return {}


def _player_response(uid: int) -> dict:
    try:
        p = db.get_or_create_player(uid, "")
        return _player_api(dict(p))
    except Exception:
        return {}


def register_ring_payment_routes(app: FastAPI) -> None:

    @app.post("/api/equipment/ring_stars_invoice")
    async def ring_stars_invoice(body: _RingPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "ring_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Предмет не найден или не является мифическим"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}

        stars = int(item.get("price_stars", 490))
        title = item["name"]
        desc = f"Мифическое кольцо Duel Arena: {item.get('desc', '')}"
        payload = f"ring_equip_stars:{uid}:{body.item_id}"

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
                return {"ok": True, "invoice_url": data["result"]}
            logger.error("Stars ring invoice error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars ring invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/equipment/ring_stars_confirm")
    def ring_stars_confirm(body: _RingPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "ring_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Предмет не найден"}

        db.equip_item(uid, "ring1", body.item_id)
        db.add_owned_weapon(uid, body.item_id)
        _cache_invalidate(uid)
        return {"ok": True, "equipment": _eq_response(uid), "player": _player_response(uid)}
