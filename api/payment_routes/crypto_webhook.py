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
    _cache_invalidate = ctx["_cache_invalidate"]
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

        # CRITICAL: парсинг :diamond_first: ДО confirm_crypto_invoice — иначе
        # _diamond_first_col не определён → UnboundLocalError → webhook падает,
        # USDT-платежи не доставляются.
        custom_payload = inv.get("payload", "")
        is_diamond_first = ":diamond_first:" in custom_payload
        try:
            diamond_first_count = int(custom_payload.split(":diamond_first:", 1)[1].strip()) if is_diamond_first else 0
        except (ValueError, IndexError):
            diamond_first_count = 0
            is_diamond_first = False
        _diamond_first_col = None
        if is_diamond_first and diamond_first_count > 0:
            if diamond_first_count <= 100:
                _diamond_first_col = "diamond_first_100"
            elif diamond_first_count <= 300:
                _diamond_first_col = "diamond_first_300"
            else:
                _diamond_first_col = "diamond_first_500"

        result = db.confirm_crypto_invoice(int(invoice_id), first_purchase_col=_diamond_first_col)
        if result.get("ok"):
            uid = result["user_id"]
            diamonds = result["diamonds"]
            asset = result.get("asset", "USDT")
            amount_str = result.get("amount", "0")
            is_premium = ":premium:" in custom_payload
            is_full_reset = ":full_reset:" in custom_payload
            avatar_id = custom_payload.split(":avatar:", 1)[1].strip() if ":avatar:" in custom_payload else None
            is_usdt_slot = ":usdt_slot:" in custom_payload
            is_usdt_reset = ":usdt_reset:" in custom_payload
            is_usdt_scroll = ":usdt_scroll:" in custom_payload
            is_weapon_equip = ":weapon_equip:" in custom_payload
            is_shield_equip = ":shield_equip:" in custom_payload
            is_helmet_equip = ":helmet_equip:" in custom_payload
            is_boots_equip  = ":boots_equip:"  in custom_payload
            is_ring_equip   = ":ring_equip:"   in custom_payload
            is_armor_class  = ":armor_class:"  in custom_payload
            # Этап 8: аренда mythic-предмета за USDT
            from api.payment_routes.rental_deliver import deliver_rental, parse_rental_payload
            is_rental = ":rental:" in custom_payload
            rental_item_id = parse_rental_payload(custom_payload) if is_rental else ""
            usdt_reset_class_id = custom_payload.split(":usdt_reset:", 1)[1].strip() if is_usdt_reset else None
            usdt_scroll_id = custom_payload.split(":usdt_scroll:", 1)[1].strip() if is_usdt_scroll else None
            weapon_equip_id = custom_payload.split(":weapon_equip:", 1)[1].strip() if is_weapon_equip else None
            shield_equip_id = custom_payload.split(":shield_equip:", 1)[1].strip() if is_shield_equip else None
            helmet_equip_id = custom_payload.split(":helmet_equip:", 1)[1].strip() if is_helmet_equip else None
            boots_equip_id  = custom_payload.split(":boots_equip:",  1)[1].strip() if is_boots_equip  else None
            ring_equip_id   = custom_payload.split(":ring_equip:",   1)[1].strip() if is_ring_equip   else None
            armor_class_id  = custom_payload.split(":armor_class:",  1)[1].strip() if is_armor_class  else None
            logger.info("CryptoPay paid: uid=%s diamonds=%s premium=%s reset=%s usdt_slot=%s scroll=%s asset=%s invoice=%s", uid, diamonds, is_premium, is_full_reset, is_usdt_slot, usdt_scroll_id, asset, invoice_id)
            # --- Мифическое снаряжение за USDT (weapon/shield/helmet/boots/ring)
            # Раньше обрабатывался только weapon; для остальных предметы выдавались
            # только через polling /api/shop/crypto_check из живого mini app.
            # Если mini app закрылся — покупка терялась.
            # armor_equip — отдельная ветка ниже, т.к. owned пишется в player_owned_armor,
            # а не в player_owned_weapons (см. equipment_repo.get_equipment для slot=armor)
            is_armor_equip = ":armor_equip:" in custom_payload
            armor_equip_id = custom_payload.split(":armor_equip:", 1)[1].strip() if is_armor_equip else None
            _equip_map = [
                (is_weapon_equip, weapon_equip_id, "weapon", "weapon_equipped", "weapon_id", "⚔️ Мифическое оружие",   "Меч"),
                (is_shield_equip, shield_equip_id, "shield", "shield_equipped", "shield_id", "🛡 Мифический щит",       "Щит"),
                (is_helmet_equip, helmet_equip_id, "belt",   "helmet_equipped", "helmet_id", "⛑ Мифический шлем",      "Шлем"),
                (is_boots_equip,  boots_equip_id,  "boots",  "boots_equipped",  "boots_id",  "🥾 Мифические ботинки",   "Ботинки"),
                (is_ring_equip,   ring_equip_id,   "ring1",  "ring_equipped",   "ring_id",   "💍 Мифическое кольцо",    "Кольцо"),
                (is_armor_equip,  armor_equip_id,  "armor",  "armor_equipped",  "armor_id",  "🛡 Мифическая броня",     "Броня"),
            ]
            _handled_equip = False
            for _flag, _item_id, _slot, _evt, _id_key, _title, _section in _equip_map:
                if _flag and _item_id:
                    _handled_equip = True
                    _equip_ok = False
                    try:
                        # force=True: кольцо/броня пишем точно в свой слот (ring1, armor),
                        # минуя резолвер ring1/ring2 (мини-апп профиля рендерит только ring1).
                        db.equip_item(uid, _slot, _item_id, force=True)
                        # armor владеется через отдельную таблицу — иначе get_equipment
                        # для mythic-armor не пройдёт owned-проверку и снимет слот.
                        if _slot == "armor":
                            db.add_owned_armor(uid, _item_id)
                        else:
                            db.add_owned_weapon(uid, _item_id)
                        _cache_invalidate(uid)
                        _equip_ok = True
                    except Exception as _e:
                        logger.error("CRITICAL: %s equip failed after payment uid=%s item=%s invoice=%s err=%s",
                                     _slot, uid, _item_id, invoice_id, _e)
                    if _equip_ok:
                        db.mark_items_delivered(int(invoice_id))
                        await manager.send(uid, {"event": _evt, _id_key: _item_id, "source": "cryptopay"})
                        await _send_tg_message(uid, f"{_title} <b>получено!</b>\nОткройте раздел «{_section}» в профиле — предмет уже надет.\n\n⚔️ Duel Arena")
                    else:
                        await _send_tg_message(uid, f"⚠️ Оплата получена, но выдача {_title.lower()} задержалась. Напишите в поддержку и укажите ID платежа: {invoice_id}")
                    break
            if _handled_equip:
                pass  # handled above
            elif is_rental and rental_item_id:
                # Этап 8: аренда mythic за USDT. Идемпотентно.
                _rent_ok = deliver_rental(db, uid, rental_item_id)
                _cache_invalidate(uid)
                if _rent_ok:
                    db.mark_items_delivered(int(invoice_id))
                    await manager.send(uid, {"event": "rental_activated", "item_id": rental_item_id, "source": "cryptopay"})
                    await _send_tg_message(uid, f"🕐 <b>Аренда оформлена — предмет надет!</b>\nОткройте игру — увидите его в снаряжении.\n\n⚔️ Duel Arena")
                else:
                    await _send_tg_message(uid, f"⚠️ Оплата получена, но выдача аренды задержалась. Напишите в поддержку и укажите ID платежа: {invoice_id}")
            elif is_armor_class and armor_class_id:
                # Унификация armor: `:armor_class:` теперь только для legendary_usdt
                # (armor_mythic4 +19 свободных статов). Остальные мифик-брони
                # должны идти через `:armor_equip:` (см. _equip_map выше).
                if armor_class_id != "legendary_usdt":
                    logger.warning(
                        "deprecated armor_class marker for %s in invoice %s — игнорирую (используйте armor_equip)",
                        armor_class_id, invoice_id,
                    )
                    db.mark_items_delivered(int(invoice_id))
                else:
                    _armor_ok = False
                    try:
                        ok2, msg2 = db.create_legendary_armor(uid)
                        _armor_ok = bool(ok2) or ("уже" in (msg2 or "").lower())
                    except Exception as _e:
                        logger.error("CRITICAL: legendary_usdt creation uid=%s invoice=%s err=%s",
                                     uid, invoice_id, _e)
                    _cache_invalidate(uid)
                    await manager.send(uid, {"event": "armor_class_purchased", "class_id": "armor_mythic4", "source": "cryptopay"})
                    await _send_tg_message(uid, "💠 <b>Легендарная броня получена!</b>\nОткройте «Профиль → 🛡 Броня» и настройте её.\n\n⚔️ Duel Arena")
                    if _armor_ok:
                        db.mark_items_delivered(int(invoice_id))
            elif is_usdt_scroll and usdt_scroll_id:
                _scroll_ok = False
                try:
                    db.add_to_inventory(uid, usdt_scroll_id)
                    _scroll_ok = True
                except Exception as _e:
                    logger.error("CRITICAL: add_to_inventory failed after confirm uid=%s scroll=%s invoice=%s err=%s", uid, usdt_scroll_id, invoice_id, _e)
                await manager.send(uid, {"event": "scroll_received", "scroll_id": usdt_scroll_id})
                from api.tma_catalogs import SHOP_CATALOG
                scroll_info = SHOP_CATALOG.get(usdt_scroll_id, {})
                await _send_tg_message(uid, f"{scroll_info.get('icon', '📜')} <b>{scroll_info.get('name', usdt_scroll_id)} получен!</b>\nОткройте «Герой → Моё → Особые» и нажмите Применить.\n\n⚔️ Duel Arena")
                if _scroll_ok:
                    db.mark_items_delivered(int(invoice_id))
            elif is_usdt_slot:
                ok2, msg2 = db.create_legendary_armor(uid)
                await manager.send(uid, {"event": "usdt_slot_created", "class_id": "armor_mythic4", "ok": ok2})
                await _send_tg_message(uid, f"💠 <b>Легендарная броня получена!</b>\nОткройте «Профиль → 🛡 Броня» и настройте её.\n\n⚔️ Duel Arena")
                if ok2 or "уже" in (msg2 or "").lower():
                    db.mark_items_delivered(int(invoice_id))
            elif is_usdt_reset and usdt_reset_class_id:
                db.reset_legendary(uid)
                await manager.send(uid, {"event": "usdt_slot_reset", "class_id": "armor_mythic4"})
                await _send_tg_message(uid, f"🔄 <b>Статы Легендарной брони сброшены!</b>\nОткройте «Профиль → 🛡 Броня» и распределите заново.\n\n⚔️ Duel Arena")
                db.mark_items_delivered(int(invoice_id))
            elif avatar_id:
                unlock = db.unlock_avatar(uid, avatar_id, source="usdt")
                if unlock.get("ok"):
                    if not unlock.get("already_unlocked"):
                        db.track_purchase(uid, avatar_id, "usdt", 0)
                        if asset == "USDT":
                            try:
                                db.process_referral_vip_shop_purchase(uid, usdt=float(amount_str))
                            except Exception as _ve:
                                logger.error("vip_shop avatar usdt uid=%s: %s", uid, _ve)
                    _cache_invalidate(uid)
                    await manager.send(uid, {"event": "avatar_unlocked", "avatar_id": avatar_id, "source": "cryptopay"})
                    await _send_tg_message(uid, f"👑 <b>Новый образ разблокирован!</b>\nОбраз: <b>{avatar_id}</b>\nОткройте «Статы → Образы» и наденьте его.\n\n⚔️ Duel Arena")
                    db.mark_items_delivered(int(invoice_id))
                else:
                    logger.error(
                        "CRITICAL: avatar unlock failed after paid invoice=%s uid=%s avatar=%s reason=%s",
                        invoice_id,
                        uid,
                        avatar_id,
                        unlock.get("reason"),
                    )
                    await _send_tg_message(uid, "⚠️ Оплата получена, но выдача образа задержалась. Напишите в поддержку и укажите ID платежа.")
            elif is_diamond_first and diamond_first_count > 0:
                # Флаг и алмазы уже выданы атомически в confirm_crypto_invoice
                db.mark_items_delivered(int(invoice_id))
                await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamond_first_count, "source": "cryptopay_first"})
                await _send_tg_message(uid,
                    f"💎 <b>+{diamond_first_count} алмазов зачислено!</b>\n"
                    "🔥 Скидка первой покупки использована.\n\n"
                    "⚔️ Duel Arena"
                )
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
                db.mark_items_delivered(int(invoice_id))
            elif is_full_reset:
                await _notify_paid_full_reset(uid)
                db.mark_items_delivered(int(invoice_id))
            else:
                if asset == "USDT":
                    try:
                        db.process_referral_vip_shop_purchase(uid, usdt=float(amount_str))
                    except Exception as _ve:
                        logger.error("vip_shop diamonds usdt uid=%s: %s", uid, _ve)
                await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "cryptopay"})
                await _send_tg_message(uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через CryptoPay подтверждена.\n\n⚔️ Duel Arena")
                db.mark_items_delivered(int(invoice_id))
        else:
            logger.warning("CryptoPay confirm_invoice %s: %s", invoice_id, result.get("reason"))
        return {"ok": True}
