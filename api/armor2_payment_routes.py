"""Маршруты оплаты мифической armor2 за Stars и USDT.

Для обычных мификов (armor2_mythic1/2/3). armor2_mythic4 (Легендарная
USDT-броня +19 свободных статов) — отдельные endpoints в legendary_armor2
(пока не реализованы — Этап 2.4.C).

Чистая реализация — owned пишется в player_owned_armor2 (отдельная таблица).
"""
from __future__ import annotations

import asyncio
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


class _Armor2PayBody(InitDataHeader):
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


def register_armor2_payment_routes(app: FastAPI) -> None:

    @app.post("/api/equipment/armor2_stars_invoice")
    async def armor2_stars_invoice(body: _Armor2PayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor2_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic" or item.get("slot") != "armor2":
            return {"ok": False, "reason": "Предмет не найден или не является мифической бронёй"}
        # armor2_mythic4 — особая Легендарная, идёт через свой legendary endpoint
        if body.item_id == "armor2_mythic4":
            return {"ok": False, "reason": "Используйте /api/equipment/armor2_legendary_stars_invoice"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}

        stars = int(item.get("price_stars", 800))
        title = item["name"]
        desc = f"Мифическая броня Duel Arena: {item.get('desc', '')}"
        payload = f"armor2_equip_stars:{uid}:{body.item_id}"

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
            logger.error("Stars armor2 invoice error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars armor2 invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/equipment/armor2_stars_confirm")
    async def armor2_stars_confirm(body: _Armor2PayBody):
        """Read-only: ждём пока бот обработает successful_payment и выдаст броню."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor2_pay", max_hits=10, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic" or item.get("slot") != "armor2":
            return {"ok": False, "reason": "Предмет не найден"}

        for _ in range(6):  # 6 × 500мс = до 3 сек
            if body.item_id in db.get_owned_armor2(uid):
                _cache_invalidate(uid)
                return {
                    "ok": True,
                    "equipment": _eq_response(uid),
                    "player": _player_response(uid),
                    "owned_armor2": db.get_owned_armor2(uid),
                }
            await asyncio.sleep(0.5)
        return {"ok": False, "reason": "processing"}

    @app.post("/api/equipment/armor2_crypto_invoice")
    async def armor2_crypto_invoice(body: _Armor2PayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor2_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic" or item.get("slot") != "armor2":
            return {"ok": False, "reason": "Предмет не найден"}
        if body.item_id == "armor2_mythic4":
            return {"ok": False, "reason": "Используйте /api/equipment/armor2_legendary_crypto_invoice"}
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

        description = f"Duel Arena — {item['name']} (мифическая броня)"
        payload_str = f"uid:{uid}:armor2_equip:{body.item_id}"

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
            logger.error("CryptoPay armor2 invoice error: %s", e)
            return {"ok": False, "reason": f"Ошибка соединения: {e}"}
