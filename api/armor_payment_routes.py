"""Маршруты оплаты мифической брони (classes) за Stars и USDT.

Мифик-броня — это `class_id` из MYTHIC_CLASSES (berserker_mythic, assassin_mythic,
archmage_mythic). Не путать с легендарным слотом (`legendary_usdt` / usdt_custom_*),
у которого отдельный путь в api/wardrobe_routes/usdt_crypto_routes.py.
"""
from __future__ import annotations

import logging

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from api.tma_auth import get_user_from_init_data
from api.tma_catalogs import CRYPTOPAY_API_BASE
from api.tma_infra import _rl_check
from config import BOT_TOKEN, CRYPTOPAY_TOKEN, MYTHIC_CLASSES
from database import db

logger = logging.getLogger(__name__)


class _ArmorPayBody(BaseModel):
    init_data: str
    class_id: str


def register_armor_payment_routes(app: FastAPI) -> None:

    @app.post("/api/wardrobe/armor_stars_invoice")
    async def armor_stars_invoice(body: _ArmorPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor_pay", max_hits=5, window_sec=60)

        class_id = body.class_id.strip()
        cls = MYTHIC_CLASSES.get(class_id)
        if not cls:
            return {"ok": False, "reason": "Броня не найдена"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}

        stars = int(cls.get("price_stars", 590))
        title = cls["name"]
        desc = f"Мифическая броня Duel Arena: {cls.get('special_bonus', '')}"
        payload = f"armor_class_stars:{uid}:{class_id}"

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
            logger.error("Stars armor invoice error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars armor invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/wardrobe/armor_crypto_invoice")
    async def armor_crypto_invoice(body: _ArmorPayBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor_pay", max_hits=5, window_sec=60)

        class_id = body.class_id.strip()
        cls = MYTHIC_CLASSES.get(class_id)
        if not cls:
            return {"ok": False, "reason": "Броня не найдена"}
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

        amount = str(cls.get("price_usdt", "11.99"))
        description = f"Duel Arena — {cls['name']} (мифическая броня)"
        payload_str = f"uid:{uid}:armor_class:{class_id}"

        try:
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
                url = inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url") or inv.get("web_app_invoice_url")
                return {"ok": True, "invoice_url": url,
                        "web_app_url": inv.get("web_app_invoice_url"),
                        "invoice_id": inv["invoice_id"]}
            err = data.get("error") or {}
            return {"ok": False, "reason": f"CryptoPay [{err.get('code','?')}] {err.get('name','UNKNOWN')}"}
        except Exception as e:
            logger.error("CryptoPay armor invoice error: %s", e)
            return {"ok": False, "reason": f"Ошибка соединения: {e}"}
