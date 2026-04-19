from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import APIRouter

logger = logging.getLogger(__name__)


def register_crypto_check_route(router: APIRouter, ctx: Dict[str, Any]) -> None:
    db = ctx["db"]
    manager = ctx["manager"]
    _cache_invalidate = ctx["_cache_invalidate"]
    get_user_from_init_data = ctx["get_user_from_init_data"]
    _player_api = ctx["_player_api"]
    _send_tg_message = ctx["_send_tg_message"]
    _notify_paid_full_reset = ctx["_notify_paid_full_reset"]
    CRYPTOPAY_TOKEN = ctx["CRYPTOPAY_TOKEN"]
    CRYPTOPAY_API_BASE = ctx["CRYPTOPAY_API_BASE"]
    PREMIUM_XP_BONUS_PERCENT = ctx["PREMIUM_XP_BONUS_PERCENT"]

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
            payload_uid = None
            if custom_payload.startswith("uid:"):
                parts = custom_payload.split(":")
                if len(parts) > 1:
                    try:
                        payload_uid = int(parts[1])
                    except Exception:
                        payload_uid = None
            if payload_uid is not None and payload_uid != uid:
                logger.warning("crypto_check invoice %s payload uid mismatch payload=%s init=%s", invoice_id, payload_uid, uid)
                return {"ok": False, "reason": "invoice_user_mismatch"}
            is_premium = ":premium:" in custom_payload
            is_full_reset = ":full_reset:" in custom_payload
            is_usdt_scroll = ":usdt_scroll:" in custom_payload
            is_usdt_slot = ":usdt_slot:" in custom_payload
            is_usdt_reset = ":usdt_reset:" in custom_payload
            usdt_scroll_id = custom_payload.split(":usdt_scroll:", 1)[1].strip() if is_usdt_scroll else None
            usdt_reset_class_id = custom_payload.split(":usdt_reset:", 1)[1].strip() if is_usdt_reset else None
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
                if is_usdt_scroll and usdt_scroll_id:
                    _scroll_ok = False
                    try:
                        db.add_to_inventory(owner_uid, usdt_scroll_id)
                        _scroll_ok = True
                    except Exception as _e:
                        logger.error("CRITICAL: add_to_inventory failed after confirm uid=%s scroll=%s invoice=%s err=%s", owner_uid, usdt_scroll_id, invoice_id, _e)
                    await manager.send(owner_uid, {"event": "scroll_received", "scroll_id": usdt_scroll_id})
                    from api.tma_catalogs import SHOP_CATALOG
                    scroll_info = SHOP_CATALOG.get(usdt_scroll_id, {})
                    await _send_tg_message(owner_uid, f"{scroll_info.get('icon', '📜')} <b>{scroll_info.get('name', usdt_scroll_id)} получен!</b>\nОткройте «Герой → Моё → Особые» и нажмите Применить.\n\n⚔️ Duel Arena")
                    if _scroll_ok:
                        db.mark_items_delivered(invoice_id)
                    return {"ok": True, "paid": True, "scroll_received": True, "scroll_id": usdt_scroll_id}
                if is_usdt_slot:
                    ok2, msg2, new_class_id = db.create_usdt_class(owner_uid)
                    await manager.send(owner_uid, {"event": "usdt_slot_created", "class_id": new_class_id, "ok": ok2})
                    await _send_tg_message(owner_uid, f"💠 <b>Легендарный образ получен!</b>\nОткройте «Статы → Гардероб → Мой инвентарь» и настройте его.\n\n⚔️ Duel Arena")
                    if ok2:
                        db.mark_items_delivered(invoice_id)
                    return {"ok": True, "paid": True, "usdt_slot_created": True, "class_id": new_class_id}
                if is_usdt_reset and usdt_reset_class_id:
                    db.reset_usdt_slot_stats(owner_uid, usdt_reset_class_id)
                    await manager.send(owner_uid, {"event": "usdt_slot_reset", "class_id": usdt_reset_class_id})
                    await _send_tg_message(owner_uid, f"🔄 <b>Статы образа сброшены!</b>\nОткройте «Гардероб» и настройте новую сборку.\n\n⚔️ Duel Arena")
                    db.mark_items_delivered(invoice_id)
                    return {"ok": True, "paid": True, "usdt_slot_reset": True, "class_id": usdt_reset_class_id}
                if avatar_id:
                    unlock = db.unlock_avatar(owner_uid, avatar_id, source="usdt")
                    if not unlock.get("ok"):
                        logger.error("crypto_check avatar unlock failed uid=%s invoice=%s avatar=%s reason=%s", owner_uid, invoice_id, avatar_id, unlock.get("reason"))
                        return {"ok": False, "reason": f"unlock_failed:{unlock.get('reason', 'unknown')}"}
                    if not unlock.get("already_unlocked"):
                        db.track_purchase(owner_uid, avatar_id, "usdt", 0)
                    _cache_invalidate(owner_uid)
                    await manager.send(owner_uid, {"event": "avatar_unlocked", "avatar_id": avatar_id, "source": "cryptopay"})
                    await _send_tg_message(owner_uid, f"👑 <b>Новый образ разблокирован!</b>\nОбраз: <b>{avatar_id}</b>\nОткройте «Статы → Образы» и наденьте его.\n\n⚔️ Duel Arena")
                    db.mark_items_delivered(invoice_id)
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
                    db.mark_items_delivered(invoice_id)
                    return {"ok": True, "paid": True, "diamonds": bonus_d, "premium_activated": True, "premium_days_left": days_left, "bonus_diamonds": bonus_d}
                if is_full_reset:
                    await _notify_paid_full_reset(owner_uid)
                    db.mark_items_delivered(invoice_id)
                    return {"ok": True, "paid": True, "profile_reset": True}
                await manager.send(owner_uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "cryptopay"})
                await _send_tg_message(owner_uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через CryptoPay подтверждена.\n\n⚔️ Duel Arena")
                db.mark_items_delivered(invoice_id)
                return {"ok": True, "paid": True, "diamonds": diamonds}
            if result.get("reason") == "already_paid":
                if avatar_id:
                    unlock = db.unlock_avatar(uid, avatar_id, source="usdt")
                    if unlock.get("ok"):
                        if not unlock.get("already_unlocked"):
                            db.track_purchase(uid, avatar_id, "usdt", 0)
                        _cache_invalidate(uid)
                        db.mark_items_delivered(invoice_id)
                        fresh = db.get_or_create_player(uid, "")
                        return {
                            "ok": True,
                            "paid": True,
                            "already_confirmed": True,
                            "avatar_unlocked": True,
                            "avatar_id": avatar_id,
                            "player": _player_api(dict(fresh)),
                        }
                    logger.error("crypto_check already_paid unlock retry failed uid=%s invoice=%s avatar=%s reason=%s", uid, invoice_id, avatar_id, unlock.get("reason"))
                if is_premium:
                    prem = db.activate_premium(uid, days=21)
                    bonus_d = prem.get("bonus_diamonds", 0)
                    days_left = prem.get("days_left", 21)
                    await manager.send(uid, {"event": "premium_activated", "days_left": days_left, "bonus_diamonds": bonus_d, "source": "cryptopay"})
                    db.mark_items_delivered(invoice_id)
                    return {"ok": True, "paid": True, "already_confirmed": True, "premium_activated": True, "premium_days_left": days_left}
                if is_usdt_reset and usdt_reset_class_id:
                    db.reset_usdt_slot_stats(uid, usdt_reset_class_id)
                    await manager.send(uid, {"event": "usdt_slot_reset", "class_id": usdt_reset_class_id})
                    db.mark_items_delivered(invoice_id)
                    return {"ok": True, "paid": True, "already_confirmed": True, "usdt_slot_reset": True, "class_id": usdt_reset_class_id}
                return {
                    "ok": True, "paid": True, "already_confirmed": True,
                    "profile_reset": is_full_reset,
                    "scroll_received": is_usdt_scroll,
                    "scroll_id": usdt_scroll_id if is_usdt_scroll else None,
                    "usdt_slot_created": is_usdt_slot,
                }
            return {"ok": False, "reason": result.get("reason")}
        except Exception as e:
            logger.error("crypto_check error: %s", e)
            return {"ok": False, "reason": "connection_error"}
