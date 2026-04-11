from __future__ import annotations

import hashlib
import hmac as _hmac
import json
import logging
from typing import Any, Dict

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def register_crypto_webhook_route(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    manager = ctx["manager"]
    _send_tg_message = ctx["_send_tg_message"]
    _notify_paid_full_reset = ctx["_notify_paid_full_reset"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    PREMIUM_XP_BONUS_PERCENT = ctx["PREMIUM_XP_BONUS_PERCENT"]

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
            is_usdt_slot = ":usdt_slot:" in custom_payload
            is_usdt_reset = ":usdt_reset:" in custom_payload
            is_usdt_scroll = ":usdt_scroll:" in custom_payload
            usdt_reset_class_id = custom_payload.split(":usdt_reset:", 1)[1].strip() if is_usdt_reset else None
            usdt_scroll_id = custom_payload.split(":usdt_scroll:", 1)[1].strip() if is_usdt_scroll else None
            logger.info("CryptoPay paid: uid=%s diamonds=%s premium=%s reset=%s usdt_slot=%s scroll=%s asset=%s invoice=%s", uid, diamonds, is_premium, is_full_reset, is_usdt_slot, usdt_scroll_id, asset, invoice_id)
            if is_usdt_scroll and usdt_scroll_id:
                try:
                    db.add_to_inventory(uid, usdt_scroll_id)
                except Exception as _e:
                    logger.error("CRITICAL: add_to_inventory failed after confirm uid=%s scroll=%s invoice=%s err=%s", uid, usdt_scroll_id, invoice_id, _e)
                await manager.send(uid, {"event": "scroll_received", "scroll_id": usdt_scroll_id})
                from api.tma_catalogs import SHOP_CATALOG
                scroll_info = SHOP_CATALOG.get(usdt_scroll_id, {})
                await _send_tg_message(uid, f"{scroll_info.get('icon', '📜')} <b>{scroll_info.get('name', usdt_scroll_id)} получен!</b>\nОткройте «Герой → Моё → Особые» и нажмите Применить.\n\n⚔️ Duel Arena")
            elif is_usdt_slot:
                ok2, msg2, new_class_id = db.create_usdt_class(uid)
                await manager.send(uid, {"event": "usdt_slot_created", "class_id": new_class_id, "ok": ok2})
                await _send_tg_message(uid, f"💠 <b>USDT-образ получен!</b>\nОткройте «Статы → Гардероб → Мой инвентарь» и настройте его.\n\n⚔️ Duel Arena")
            elif is_usdt_reset and usdt_reset_class_id:
                db.reset_usdt_slot_stats(uid, usdt_reset_class_id)
                await manager.send(uid, {"event": "usdt_slot_reset", "class_id": usdt_reset_class_id})
                await _send_tg_message(uid, f"🔄 <b>Статы образа сброшены!</b>\nОткройте «Гардероб» и настройте новую сборку.\n\n⚔️ Duel Arena")
            elif avatar_id:
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
