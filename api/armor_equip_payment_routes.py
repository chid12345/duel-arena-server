"""Маршруты оплаты мифической брони (slot=armor) за Stars и USDT.

Унификация armor (этап 8): броня покупается как обычный предмет, не как класс.
По образу api/helmet_payment_routes.py с маркером :armor_equip: (вместо :helmet_equip:).
Доставка: crypto_check / crypto_webhook / recovery_deliver.

Старый путь — api/armor_payment_routes.py (через class_id) — остаётся для
legendary_usdt (armor_mythic4) с +19 свободных статов.
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


class _ArmorEquipPayBody(InitDataHeader):
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


def register_armor_equip_payment_routes(app: FastAPI) -> None:

    @app.post("/api/equipment/armor_stars_invoice")
    async def armor_stars_invoice(body: _ArmorEquipPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor_equip_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic" or item.get("slot") != "armor":
            return {"ok": False, "reason": "Броня не найдена или не является мифической"}
        # legendary_usdt идёт через старый /api/wardrobe/* — не сюда
        if body.item_id == "armor_mythic4":
            return {"ok": False, "reason": "Используйте /api/wardrobe/armor_stars_invoice для legendary_usdt"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}

        stars = int(item.get("price_stars", 800))
        title = item["name"]
        desc = f"Мифическая броня Duel Arena: {item.get('desc', '')}"
        payload = f"armor_equip_stars:{uid}:{body.item_id}"

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
            logger.error("Stars armor_equip invoice error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars armor_equip invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/equipment/armor_stars_confirm")
    async def armor_stars_confirm(body: _ArmorEquipPayBody):
        """Read-only: ждём пока бот обработает successful_payment.
        Выдача — handlers/commands/shop_payments.py обрабатывает armor_equip_stars."""
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor_equip_pay", max_hits=10, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic" or item.get("slot") != "armor":
            return {"ok": False, "reason": "Броня не найдена"}

        for _ in range(6):  # 6 × 500мс = до 3 сек на race condition
            if body.item_id in db.get_owned_armor(uid):
                _cache_invalidate(uid)
                return {"ok": True, "equipment": _eq_response(uid), "player": _player_response(uid)}
            await asyncio.sleep(0.5)
        return {"ok": False, "reason": "processing"}

    @app.post("/api/equipment/armor_crypto_invoice")
    async def armor_crypto_invoice(body: _ArmorEquipPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor_equip_pay", max_hits=5, window_sec=60)

        item = get_item(body.item_id)
        if not item or item.get("rarity") != "mythic" or item.get("slot") != "armor":
            return {"ok": False, "reason": "Броня не найдена"}
        if body.item_id == "armor_mythic4":
            return {"ok": False, "reason": "Используйте /api/wardrobe/armor_crypto_invoice для legendary_usdt"}
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

        description = f"Duel Arena — {item['name']} (мифическая броня)"
        payload_str = f"uid:{uid}:armor_equip:{body.item_id}"

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
            logger.error("CryptoPay armor_equip invoice error: %s", e)
            return {"ok": False, "reason": f"Ошибка соединения: {e}"}
