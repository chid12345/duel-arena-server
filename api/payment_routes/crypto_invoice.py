from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

from api.payment_routes.models import CryptoInvoiceBody

logger = logging.getLogger(__name__)


def register_crypto_invoice_route(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _rl_check = ctx["_rl_check"]
    CRYPTO_PACKAGES = ctx["CRYPTO_PACKAGES"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]
    USDT_SCROLL_PACKAGES = ctx.get("USDT_SCROLL_PACKAGES", [])

    @router.post("/api/shop/crypto_invoice")
    async def crypto_invoice(body: CryptoInvoiceBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid_rl = int(tg_user["id"])
        _rl_check(uid_rl, "crypto_invoice", max_hits=3, window_sec=30)
        uid = int(tg_user["id"])

        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

        # Проверяем USDT-свитки
        usdt_scroll_pkg = next((p for p in USDT_SCROLL_PACKAGES if p["id"] == body.package_id), None)
        if usdt_scroll_pkg:
            scroll_id = usdt_scroll_pkg["scroll_id"]
            amount = str(usdt_scroll_pkg["usdt"])
            description = f"Duel Arena — {usdt_scroll_pkg['label']}"
            payload_str = f"uid:{uid}:usdt_scroll:{scroll_id}"
            import httpx
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(
                        f"{CRYPTOPAY_API_BASE}/createInvoice",
                        headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                        json={"asset": "USDT", "amount": amount, "payload": payload_str,
                              "description": description, "allow_comments": False, "allow_anonymous": False},
                    )
                    data = resp.json()
                if data.get("ok"):
                    inv = data["result"]
                    db.create_crypto_invoice(uid, inv["invoice_id"], 0, "USDT", amount, payload=payload_str)
                    return {"ok": True, "invoice_url": inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url"), "invoice_id": inv["invoice_id"]}
                err = data.get("error") or {}
                return {"ok": False, "reason": f"CryptoPay [{err.get('code', '?')}] {err.get('name', 'UNKNOWN')}"}
            except Exception as e:
                return {"ok": False, "reason": f"Ошибка соединения: {e}"}

        pkg = next((p for p in CRYPTO_PACKAGES if p["id"] == body.package_id), None)
        if not pkg:
            return {"ok": False, "reason": "Пакет не найден"}

        amount = str(pkg["usdt"])
        is_premium = pkg.get("premium", False)
        is_full_reset = pkg.get("full_reset", False)
        if is_premium:
            prem_status = db.get_premium_status(uid)
            if prem_status["is_active"]:
                return {"ok": False, "reason": f"👑 Premium уже активен ещё {prem_status['days_left']} дн. — деньги не списаны"}

        if is_full_reset:
            description = "Duel Arena — сброс прогресса (💰💎 клан рефералка сохраняются, USDT)"
            payload_str = f"uid:{uid}:full_reset:1"
        elif is_premium:
            description = "Duel Arena — 👑 Premium подписка"
            payload_str = f"uid:{uid}:premium:1"
        else:
            description = f"Duel Arena — {pkg['diamonds']} 💎 алмазов"
            payload_str = f"uid:{uid}:diamonds:{pkg['diamonds']}"

        import httpx
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
                db.create_crypto_invoice(uid, inv["invoice_id"], pkg["diamonds"], "USDT", amount, payload=payload_str)
                return {"ok": True, "invoice_url": inv.get("mini_app_invoice_url") or inv.get("bot_invoice_url"), "invoice_id": inv["invoice_id"]}
            err = data.get("error") or {}
            code = err.get("code", "?")
            name = err.get("name", "UNKNOWN")
            msg = err.get("message", "")
            logger.error("CryptoPay createInvoice error [%s %s] %s | full=%s", code, name, msg, data)
            reason = f"CryptoPay [{code}] {name}"
            if msg:
                reason += f": {msg}"
            return {"ok": False, "reason": reason}
        except Exception as e:
            logger.error("CryptoPay HTTP error: %s", e)
            return {"ok": False, "reason": f"Ошибка соединения с CryptoPay: {e}"}
