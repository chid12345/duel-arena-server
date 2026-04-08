from __future__ import annotations

import hashlib
import hmac as _hmac
import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class StarsConfirmBody(BaseModel):
    init_data: str
    package_id: str


class StarsInvoiceBody(BaseModel):
    init_data: str
    package_id: str


class CryptoInvoiceBody(BaseModel):
    init_data: str
    package_id: str
    asset: str = "USDT"


def register_payment_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()

    db = ctx["db"]
    manager = ctx["manager"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _send_tg_message = ctx["_send_tg_message"]
    _notify_paid_full_reset = ctx["_notify_paid_full_reset"]
    _rl_check = ctx["_rl_check"]

    STARS_PACKAGES = ctx["STARS_PACKAGES"]
    CRYPTO_PACKAGES = ctx["CRYPTO_PACKAGES"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]
    BOT_TOKEN = ctx["BOT_TOKEN"]
    PREMIUM_XP_BONUS_PERCENT = ctx["PREMIUM_XP_BONUS_PERCENT"]

    @router.post("/api/shop/stars_confirm")
    async def stars_confirm(body: StarsConfirmBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid = int(tg_user["id"])
        pkg = next((p for p in STARS_PACKAGES if p["id"] == body.package_id), None)
        if not pkg:
            return {"ok": False, "reason": "Пакет не найден"}

        diamonds = pkg["diamonds"]
        stars = pkg["stars"]
        is_premium = pkg["id"] == "premium"
        if is_premium:
            prem = db.get_premium_status(uid)
            if prem["is_active"]:
                fresh = db.get_or_create_player(uid, "")
                return {"ok": False, "reason": f"Premium уже активен ещё {prem['days_left']} дн.", "player": dict(fresh)}
            prem_result = db.activate_premium(uid, days=21)
            bonus_d = prem_result.get("bonus_diamonds", 0)
            days_left = prem_result.get("days_left", 21)
            try:
                ref_res = db.process_referral_stars_premium(uid, stars)
                if ref_res.get("ok"):
                    await _send_tg_message(
                        ref_res["referrer_id"],
                        f"💰 <b>Реферальный бонус!</b>\n"
                        f"Ваш приглашённый купил Premium за Telegram Stars.\n"
                        f"<b>+{ref_res['reward_usdt']:.4f} USDT</b> добавлено на ваш баланс.\n"
                        f"Выведите через раздел «Рефералка» в игре.\n\n"
                        f"⚔️ Duel Arena",
                    )
            except Exception as e:
                logger.error("process_referral_stars_premium error: %s", e)
            await manager.send(uid, {"event": "premium_activated", "days_left": days_left, "bonus_diamonds": bonus_d, "source": "stars"})
            bonus_txt = f"\n💎 Бонус при покупке: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
            await _send_tg_message(
                uid,
                f"👑 <b>Premium подписка активирована!</b>\n"
                f"Срок действия: <b>{days_left} дней</b>{bonus_txt}\n"
                f"📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>\n\n"
                f"Спасибо за покупку! ⚔️ Duel Arena",
            )
            fresh = db.get_or_create_player(uid, "")
            return {
                "ok": True,
                "diamonds_added": bonus_d,
                "premium_activated": True,
                "premium_days_left": days_left,
                "bonus_diamonds": bonus_d,
                "player": _player_api(dict(fresh)),
            }

        result = db.confirm_stars_payment(uid, body.package_id, diamonds, stars)
        if result.get("ok") and diamonds > 0:
            await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "stars"})
            await _send_tg_message(uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через Telegram Stars подтверждена.\n\n⚔️ Duel Arena")
        fresh = db.get_or_create_player(uid, "")
        return {
            "ok": True,
            "diamonds_added": diamonds,
            "already_credited": result.get("reason") == "already_credited",
            "player": _player_api(dict(fresh)),
        }

    @router.post("/api/shop/stars_invoice")
    async def stars_invoice(body: StarsInvoiceBody):
        tg_user = get_user_from_init_data(body.init_data)
        pkg = next((p for p in STARS_PACKAGES if p["id"] == body.package_id), None)
        if not pkg:
            return {"ok": False, "reason": "Пакет не найден"}
        if not BOT_TOKEN:
            return {"ok": False, "reason": "Бот не настроен (нет BOT_TOKEN)"}

        if pkg["id"] == "premium":
            payload = "premium_sub"
            title = "Premium подписка"
            desc = f"Duel Arena Premium: +{PREMIUM_XP_BONUS_PERCENT}% опыта за бои и прочие бонусы"
        else:
            payload = f"diamonds_{pkg['diamonds']}"
            title = f"{pkg['diamonds']} алмазов"
            desc = f"{pkg['diamonds']} 💎 алмазов в Duel Arena"

        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink",
                    json={
                        "title": title,
                        "description": desc,
                        "payload": payload,
                        "currency": "XTR",
                        "prices": [{"label": title, "amount": pkg["stars"]}],
                    },
                )
                data = resp.json()
            if data.get("ok"):
                return {"ok": True, "invoice_url": data["result"]}
            logger.error("createInvoiceLink error: %s", data)
            return {"ok": False, "reason": "Telegram отклонил запрос"}
        except Exception as e:
            logger.error("Stars invoice HTTP error: %s", e)
            return {"ok": False, "reason": "Ошибка соединения с Telegram"}

    @router.post("/api/shop/crypto_invoice")
    async def crypto_invoice(body: CryptoInvoiceBody):
        tg_user = get_user_from_init_data(body.init_data)
        uid_rl = int(tg_user["id"])
        _rl_check(uid_rl, "crypto_invoice", max_hits=3, window_sec=30)
        uid = int(tg_user["id"])

        pkg = next((p for p in CRYPTO_PACKAGES if p["id"] == body.package_id), None)
        if not pkg:
            return {"ok": False, "reason": "Пакет не найден"}
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

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
                db.create_crypto_invoice(uid, inv["invoice_id"], pkg["diamonds"], "USDT", amount)
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

    @router.post("/api/webhooks/cryptopay")
    async def cryptopay_webhook(request: Request):
        if not CRYPTOPAY_TOKEN:
            return JSONResponse({"ok": False}, status_code=400)

        body_bytes = await request.body()
        signature = request.headers.get("crypto-pay-api-signature", "")
        secret = hashlib.sha256(CRYPTOPAY_TOKEN.encode()).digest()
        expected = _hmac.new(secret, body_bytes, hashlib.sha256).hexdigest()
        if not _hmac.compare_digest(expected, signature):
            logger.warning("CryptoPay webhook: invalid signature")
            return JSONResponse({"ok": False}, status_code=401)

        try:
            data = json.loads(body_bytes)
        except Exception:
            return JSONResponse({"ok": False}, status_code=400)

        if data.get("update_type") != "invoice_paid":
            return {"ok": True}

        inv = data.get("payload", {})
        invoice_id = inv.get("invoice_id")
        if not invoice_id:
            return {"ok": True}

        result = db.confirm_crypto_invoice(int(invoice_id))
        if result.get("ok"):
            uid = result["user_id"]
            diamonds = result["diamonds"]
            asset = result.get("asset", "USDT")
            amount_str = result.get("amount", "0")
            custom_payload = inv.get("payload", "")
            is_premium = ":premium:" in custom_payload
            is_full_reset = ":full_reset:" in custom_payload
            avatar_id = custom_payload.split(":avatar:", 1)[1].strip() if ":avatar:" in custom_payload else None
            logger.info("CryptoPay paid: uid=%s diamonds=%s premium=%s reset=%s asset=%s invoice=%s", uid, diamonds, is_premium, is_full_reset, asset, invoice_id)
            if avatar_id:
                db.unlock_avatar(uid, avatar_id, source="usdt")
                await manager.send(uid, {"event": "avatar_unlocked", "avatar_id": avatar_id, "source": "cryptopay"})
                await _send_tg_message(uid, f"👑 <b>Новый образ разблокирован!</b>\nОбраз: <b>{avatar_id}</b>\nОткройте «Статы → Образы» и наденьте его.\n\n⚔️ Duel Arena")
            elif is_premium:
                prem = db.activate_premium(uid, days=21)
                bonus_d = prem.get("bonus_diamonds", 0)
                days_left = prem.get("days_left", 21)
                if asset == "USDT":
                    try:
                        ref_res = db.process_referral_crypto_premium(uid, float(amount_str))
                        if ref_res.get("ok"):
                            await _send_tg_message(ref_res["referrer_id"], f"💰 <b>Реферальный бонус!</b>\nВаш приглашённый купил Premium через CryptoPay.\n<b>+{ref_res['reward_usdt']:.4f} USDT</b> добавлено на ваш баланс.\n\n⚔️ Duel Arena")
                    except Exception as e:
                        logger.error("Referral crypto premium error: %s", e)
                await manager.send(uid, {"event": "premium_activated", "days_left": days_left, "bonus_diamonds": bonus_d, "source": "cryptopay"})
                bonus_txt = f"\n💎 Бонус при покупке: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
                await _send_tg_message(uid, f"👑 <b>Premium подписка активирована!</b>\nСрок действия: <b>{days_left} дней</b>{bonus_txt}\n📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>\n\nСпасибо за покупку! ⚔️ Duel Arena")
            elif is_full_reset:
                await _notify_paid_full_reset(uid)
            else:
                await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "cryptopay"})
                await _send_tg_message(uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через CryptoPay подтверждена.\n\n⚔️ Duel Arena")
        else:
            logger.warning("CryptoPay confirm_invoice %s: %s", invoice_id, result.get("reason"))
        return {"ok": True}

    @router.get("/api/shop/crypto_check/{invoice_id}")
    async def crypto_check_invoice(invoice_id: int, init_data: str):
        tg_user = get_user_from_init_data(init_data)
        uid = int(tg_user["id"])
        if not CRYPTOPAY_TOKEN:
            return {"ok": False, "reason": "CryptoPay не настроен"}

        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{CRYPTOPAY_API_BASE}/getInvoices",
                    headers={"Crypto-Pay-API-Token": CRYPTOPAY_TOKEN},
                    params={"invoice_ids": str(invoice_id)},
                )
                data = resp.json()
            if not data.get("ok"):
                return {"ok": False, "reason": "CryptoPay API error"}
            items = data.get("result", {}).get("items", [])
            if not items:
                return {"ok": False, "reason": "invoice_not_found"}
            inv = items[0]
            status = inv.get("status")
            if status != "paid":
                return {"ok": True, "status": status, "paid": False}

            custom_payload = inv.get("payload", "")
            is_premium = ":premium:" in custom_payload
            is_full_reset = ":full_reset:" in custom_payload
            avatar_id = custom_payload.split(":avatar:", 1)[1].strip() if ":avatar:" in custom_payload else None
            result = db.confirm_crypto_invoice(int(invoice_id))
            if result.get("ok"):
                diamonds = result["diamonds"]
                asset = result.get("asset", "USDT")
                amount_str = result.get("amount", "0")
                owner_uid = int(result.get("user_id", 0))
                if owner_uid != uid:
                    logger.warning("crypto_check invoice %s user mismatch db=%s init=%s", invoice_id, owner_uid, uid)
                    return {"ok": False, "reason": "invoice_user_mismatch"}
                if avatar_id:
                    db.unlock_avatar(owner_uid, avatar_id, source="usdt")
                    await manager.send(owner_uid, {"event": "avatar_unlocked", "avatar_id": avatar_id, "source": "cryptopay"})
                    await _send_tg_message(owner_uid, f"👑 <b>Новый образ разблокирован!</b>\nОбраз: <b>{avatar_id}</b>\nОткройте «Статы → Образы» и наденьте его.\n\n⚔️ Duel Arena")
                    fresh = db.get_or_create_player(owner_uid, "")
                    return {"ok": True, "paid": True, "status": "paid", "avatar_unlocked": True, "avatar_id": avatar_id, "player": _player_api(dict(fresh))}
                if is_premium:
                    prem = db.activate_premium(owner_uid, days=21)
                    bonus_d = prem.get("bonus_diamonds", 0)
                    days_left = prem.get("days_left", 21)
                    if asset == "USDT":
                        try:
                            ref_res = db.process_referral_crypto_premium(owner_uid, float(amount_str))
                            if ref_res.get("ok"):
                                await _send_tg_message(ref_res["referrer_id"], f"💰 <b>Реферальный бонус!</b>\nВаш приглашённый купил Premium через CryptoPay.\n<b>+{ref_res['reward_usdt']:.4f} USDT</b> добавлено на ваш баланс.\n\n⚔️ Duel Arena")
                        except Exception as e:
                            logger.error("Referral crypto premium (check) error: %s", e)
                    await manager.send(owner_uid, {"event": "premium_activated", "days_left": days_left, "bonus_diamonds": bonus_d, "source": "cryptopay"})
                    bonus_txt = f"\n💎 Бонус при покупке: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
                    await _send_tg_message(owner_uid, f"👑 <b>Premium подписка активирована!</b>\nСрок действия: <b>{days_left} дней</b>{bonus_txt}\n📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>\n\nСпасибо за покупку! ⚔️ Duel Arena")
                    return {"ok": True, "paid": True, "diamonds": bonus_d, "premium_activated": True, "premium_days_left": days_left, "bonus_diamonds": bonus_d}
                if is_full_reset:
                    await _notify_paid_full_reset(owner_uid)
                    return {"ok": True, "paid": True, "profile_reset": True}
                await manager.send(owner_uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "cryptopay"})
                await _send_tg_message(owner_uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через CryptoPay подтверждена.\n\n⚔️ Duel Arena")
                return {"ok": True, "paid": True, "diamonds": diamonds}
            if result.get("reason") == "already_paid":
                return {"ok": True, "paid": True, "already_confirmed": True, "profile_reset": is_full_reset}
            return {"ok": False, "reason": result.get("reason")}
        except Exception as e:
            logger.error("crypto_check error: %s", e)
            return {"ok": False, "reason": "connection_error"}

    app.include_router(router)
