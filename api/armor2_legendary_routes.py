"""Маршруты Легендарной armor2_mythic4: создание, распределение +19 свободных
статов, выбор пассивки, сброс. Чистая реализация после сноса старого armor.

Цены: $11.99 USDT / 800⭐ — покупка. $5.99 USDT / 400⭐ — сброс сборки.
"""
from __future__ import annotations

import asyncio
import logging

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

from api.tma_auth import get_user_from_init_data
from api.tma_catalogs import CRYPTOPAY_API_BASE
from api.tma_infra import _rl_check, _cache_invalidate
from api.tma_models import InitDataHeader
from api.tma_player_api import _player_api
from config import BOT_TOKEN, CRYPTOPAY_TOKEN
from database import db

logger = logging.getLogger(__name__)

ITEM_ID = "armor2_mythic4"
PRICE_USDT = "11.99"
RESET_USDT = "5.99"
PRICE_STARS = 800
RESET_STARS = 400


class _StatBody(InitDataHeader):
    stat: str


class _PassiveBody(InitDataHeader):
    passive_type: str | None = None


class _NameBody(InitDataHeader):
    custom_name: str


def _state(uid: int) -> dict:
    owned = db.is_armor2_owned(uid, ITEM_ID)
    mods = db.get_armor2_custom_mods(uid, ITEM_ID)
    # Lazy-create: если броня куплена (есть в player_owned_armor2), но запись
    # для распределения +19 статов ещё не создана — создаём сейчас. Это позволяет
    # покупке использовать общий flow :armor2_equip: (как у всех других mythic),
    # не выдумывая отдельную цепочку доставки только для одной брони.
    if owned and mods is None:
        try:
            db.create_legendary_armor2(uid)
            mods = db.get_armor2_custom_mods(uid, ITEM_ID)
        except Exception as _e:
            logger.error("armor2 legendary lazy-init uid=%s err=%s", uid, _e)
    return {"armor2_mods": mods, "owned": owned}


def _player(uid: int) -> dict:
    try:
        p = db.get_or_create_player(uid, "")
        return _player_api(dict(p))
    except Exception:
        return {}


def register_armor2_legendary_routes(app: FastAPI) -> None:

    @app.post("/api/equipment/armor2_legendary_state")
    async def state(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        return {"ok": True, **_state(uid)}

    # ─── USDT (CryptoPay) ────────────────────────────────────────────────────

    @app.post("/api/equipment/armor2_legendary_usdt_invoice")
    async def usdt_invoice(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor2_legendary", max_hits=5, window_sec=60)
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{CRYPTOPAY_API_BASE}/createInvoice",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    json={
                        "asset": "USDT", "amount": PRICE_USDT,
                        "payload": f"uid:{uid}:armor2_equip:{ITEM_ID}",
                        "description": "Duel Arena — Легендарная броня (+19 свободных статов)",
                        "allow_comments": False, "allow_anonymous": False,
                    },
                )
                data = resp.json()
            if data.get("ok"):
                inv = data["result"]
                db.create_crypto_invoice(uid, inv["invoice_id"], 0, "USDT", PRICE_USDT,
                                         payload=f"uid:{uid}:armor2_equip:{ITEM_ID}")
                url = inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url") or inv.get("web_app_invoice_url")
                return {"ok": True, "invoice_url": url,
                        "web_app_url": inv.get("web_app_invoice_url"),
                        "invoice_id": inv["invoice_id"]}
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("CryptoPay armor2_legendary invoice error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/equipment/armor2_legendary_reset_usdt_invoice")
    async def reset_usdt_invoice(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        if not db.has_legendary_armor2(uid):
            return {"ok": False, "reason": "Легендарный слот не создан"}
        _rl_check(uid, "armor2_legendary", max_hits=5, window_sec=60)
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{CRYPTOPAY_API_BASE}/createInvoice",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    json={
                        "asset": "USDT", "amount": RESET_USDT,
                        "payload": f"uid:{uid}:armor2_legendary_reset:{ITEM_ID}",
                        "description": "Duel Arena — сброс статов Легендарной брони",
                        "allow_comments": False, "allow_anonymous": False,
                    },
                )
                data = resp.json()
            if data.get("ok"):
                inv = data["result"]
                db.create_crypto_invoice(uid, inv["invoice_id"], 0, "USDT", RESET_USDT,
                                         payload=f"uid:{uid}:armor2_legendary_reset:{ITEM_ID}")
                url = inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url") or inv.get("web_app_invoice_url")
                return {"ok": True, "invoice_url": url,
                        "web_app_url": inv.get("web_app_invoice_url"),
                        "invoice_id": inv["invoice_id"]}
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("CryptoPay armor2_legendary reset invoice error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    # ─── Stars ───────────────────────────────────────────────────────────────

    @app.post("/api/equipment/armor2_legendary_stars_invoice")
    async def stars_invoice(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        _rl_check(uid, "armor2_legendary", max_hits=5, window_sec=60)
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                    json={
                        "title": "Легендарная броня",
                        "description": "Доспех Светоносного Бога — +19 свободных статов и пассивка",
                        "payload": f"armor2_legendary_stars:{uid}:create",
                        "currency": "XTR",
                        "prices": [{"label": "Легендарная броня", "amount": PRICE_STARS}],
                    },
                )
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"]}
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars armor2_legendary invoice error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    @app.post("/api/equipment/armor2_legendary_reset_stars_invoice")
    async def reset_stars_invoice(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        if not db.has_legendary_armor2(uid):
            return {"ok": False, "reason": "Легендарный слот не создан"}
        _rl_check(uid, "armor2_legendary", max_hits=5, window_sec=60)
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                    json={
                        "title": "Сброс Легендарной брони",
                        "description": "Возврат +19 свободных статов для новой сборки",
                        "payload": f"armor2_legendary_reset_stars:{uid}:{ITEM_ID}",
                        "currency": "XTR",
                        "prices": [{"label": "Сброс статов", "amount": RESET_STARS}],
                    },
                )
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"]}
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars armor2_legendary reset invoice error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения"}

    # ─── Управление статами/пассивкой ────────────────────────────────────────

    @app.post("/api/equipment/armor2_legendary_train")
    async def train(body: _StatBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, mods = await asyncio.to_thread(db.train_legendary_armor2_stat, uid, body.stat.strip())
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "armor2_mods": mods, "player": _player(uid)}
        return {"ok": False, "message": msg, "armor2_mods": mods}

    @app.post("/api/equipment/armor2_legendary_untrain")
    async def untrain(body: _StatBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, mods = await asyncio.to_thread(db.untrain_legendary_armor2_stat, uid, body.stat.strip())
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "armor2_mods": mods, "player": _player(uid)}
        return {"ok": False, "message": msg, "armor2_mods": mods}

    @app.post("/api/equipment/armor2_legendary_passive")
    async def set_passive(body: _PassiveBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, mods = await asyncio.to_thread(db.set_legendary_armor2_passive, uid, body.passive_type)
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "armor2_mods": mods, "player": _player(uid)}
        return {"ok": False, "message": msg, "armor2_mods": mods}

    @app.post("/api/equipment/armor2_legendary_apply")
    async def apply_stats(body: InitDataHeader):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg, mods = await asyncio.to_thread(db.apply_legendary_armor2_stats, uid)
        if ok:
            _cache_invalidate(uid)
            return {"ok": True, "message": msg, "armor2_mods": mods, "player": _player(uid)}
        return {"ok": False, "message": msg, "armor2_mods": mods}

    @app.post("/api/equipment/armor2_legendary_rename")
    async def rename(body: _NameBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        ok, msg = await asyncio.to_thread(db.set_legendary_armor2_name, uid, body.custom_name)
        if ok:
            return {"ok": True, "message": msg, **_state(uid)}
        return {"ok": False, "message": msg}
