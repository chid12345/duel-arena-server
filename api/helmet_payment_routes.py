"""Маршруты оплаты мифического шлема за Stars и USDT."""
from __future__ import annotations

import logging

import httpx
from fastapi import FastAPI

from api.tma_auth import get_user_from_init_data
from api.tma_catalogs import CRYPTOPAY_API_BASE
from api.tma_infra import _rl_check, _cache_invalidate
from api.tma_models import InitDataHeader
from api.tma_player_api import _player_api
from config import BOT_TOKEN, CRYPTOPAY_TOKEN
from database import db
from db_schema.equipment_catalog import get_item

logger = logging.getLogger(__name__)

MYTHIC_USDT_PRICE = "11.99"


class _HelmetPayBody(InitDataHeader):
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


def register_helmet_payment_routes(app: FastAPI) -> None:

    @app.post("/api/equipment/helmet_stars_invoice")
    async def helmet_stars_invoice(body: _HelmetPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "helmet_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Предмет не найден или не является мифическим"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}

        stars = int(item.get("price_stars", 590))
        title = item["name"]
        desc = f"Мифический шлем Duel Arena: {item.get('desc', '')}"
        payload = f"helmet_equip_stars:{uid}:{body.item_id}"

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
            logger.error("Stars helmet invoice error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars helmet invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/equipment/helmet_stars_confirm")
    def helmet_stars_confirm(body: _HelmetPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "helmet_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Предмет не найден"}

        db.equip_item(uid, "belt", body.item_id)
        db.add_owned_weapon(uid, body.item_id)
        _cache_invalidate(uid)
        return {"ok": True, "equipment": _eq_response(uid), "player": _player_response(uid)}

    @app.post("/api/equipment/helmet_crypto_invoice")
    async def helmet_crypto_invoice(body: _HelmetPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "helmet_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic":
            return {"ok": False, "reason": "Предмет не найден"}
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

        description = f"Duel Arena — {item['name']} (мифический шлем)"
        payload_str = f"uid:{uid}:helmet_equip:{body.item_id}"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{CRYPTOPAY_API_BASE}/createInvoice",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    json={
                        "asset": "USDT",
                        "amount": MYTHIC_USDT_PRICE,
                        "payload": payload_str,
                        "description": description,
                        "allow_comments": False,
                        "allow_anonymous": False,
                    },
                )
                data = resp.json()
            if data.get("ok"):
                inv = data["result"]
                db.create_crypto_invoice(uid, inv["invoice_id"], 0, "USDT", MYTHIC_USDT_PRICE, payload=payload_str)
                url = inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url") or inv.get("web_app_invoice_url")
                return {"ok": True, "invoice_url": url,
                        "web_app_url": inv.get("web_app_invoice_url"),
                        "invoice_id": inv["invoice_id"]}
            err = data.get("error") or {}
            return {"ok": False, "reason": f"CryptoPay [{err.get('code','?')}] {err.get('name','UNKNOWN')}"}
        except Exception as e:
            logger.error("CryptoPay helmet invoice error: %s", e)
            return {"ok": False, "reason": f"Ошибка соединения: {e}"}
