"""Доставка вторичных наград из recovery-цикла (paid но items_delivered=0).

Вызывается из `api/tma_startup._recover_pending_invoices` каждые 10 мин.
Симметрична c `crypto_check.py` — обрабатывает те же 12 типов payload.

Возвращает True при успехе → caller вызывает `db.mark_items_delivered(invoice_id)`.
False → флаг items_delivered остаётся 0, recovery повторит на следующем цикле.

Все DB-вызовы должны быть идемпотентны (см. их репозитории).
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable, Optional

from api.payment_routes.rental_deliver import deliver_rental

_log = logging.getLogger(__name__)


async def deliver_recovery_payload(
    db: Any,
    *,
    manager: Any,
    send_tg_message: Callable[..., Any],
    cache_invalidate: Callable[[int], None],
    loop: Optional[asyncio.AbstractEventLoop],
    uid: int,
    inv_id: int,
    payload: str,
    diamonds: int = 0,
) -> bool:
    """Выдать вторичную награду по payload инвойса. True при успехе."""
    if loop is None:
        loop = asyncio.get_event_loop()

    async def _exec(fn, *args):
        return await loop.run_in_executor(None, fn, *args)

    if ":usdt_scroll:" in payload:
        scroll_id = payload.split(":usdt_scroll:", 1)[1].strip()
        try:
            await _exec(db.add_to_inventory, uid, scroll_id)
        except Exception as e:
            _log.error("CRITICAL: recovery add_to_inventory uid=%s scroll=%s inv=%s err=%s", uid, scroll_id, inv_id, e)
            return False
        if manager is not None:
            await manager.send(uid, {"event": "scroll_received", "scroll_id": scroll_id})
        await send_tg_message(uid, "📜 <b>Свиток получен!</b>\nОткройте «Герой → Моё → Особые» и нажмите Применить.\n\n⚔️ Duel Arena")
        return True

    # Старый armor (:usdt_slot:, :usdt_reset:, :armor_class:, :armor_equip:)
    # снесён под корень — новый чистый слот «БРОНЯ» в разработке.

    if ":avatar:" in payload:
        avatar_id = payload.split(":avatar:", 1)[1].strip()
        try:
            unlock = await _exec(db.unlock_avatar, uid, avatar_id, "usdt")
            if not unlock.get("ok"):
                _log.error("CRITICAL: recovery unlock_avatar uid=%s avatar=%s inv=%s reason=%s", uid, avatar_id, inv_id, unlock.get("reason"))
                await send_tg_message(uid, "⚠️ Оплата получена, но выдача образа задержалась. Напишите в поддержку и укажите ID платежа.")
                return False
            if not unlock.get("already_unlocked"):
                await _exec(db.track_purchase, uid, avatar_id, "usdt", 0)
            cache_invalidate(uid)
        except Exception as e:
            _log.error("CRITICAL: recovery unlock_avatar exc uid=%s avatar=%s inv=%s err=%s", uid, avatar_id, inv_id, e)
            return False
        if manager is not None:
            await manager.send(uid, {"event": "avatar_unlocked", "avatar_id": avatar_id, "source": "cryptopay"})
        await send_tg_message(uid, f"👑 <b>Новый образ разблокирован!</b>\nОбраз: <b>{avatar_id}</b>\nОткройте «Статы → Образы» и наденьте его.\n\n⚔️ Duel Arena")
        return True

    if ":premium:" in payload:
        try:
            prem = await _exec(db.activate_premium, uid, 21)
        except Exception as e:
            _log.error("CRITICAL: recovery activate_premium uid=%s inv=%s err=%s", uid, inv_id, e)
            return False
        bonus_d = prem.get("bonus_diamonds", 0)
        days_left = prem.get("days_left", 21)
        if manager is not None:
            await manager.send(uid, {"event": "premium_activated", "days_left": days_left, "bonus_diamonds": bonus_d, "source": "cryptopay"})
        bonus_txt = f"\n💎 Бонус: <b>+{bonus_d} алмазов</b>" if bonus_d > 0 else ""
        await send_tg_message(uid, f"👑 <b>Premium подписка активирована!</b>\nСрок действия: <b>{days_left} дней</b>{bonus_txt}\n\nСпасибо за покупку! ⚔️ Duel Arena")
        return True

    _equip_map = (
        (":weapon_equip:", "weapon", "weapon_equipped", "weapon_id", "⚔️", "Оружие получено!"),
        (":helmet_equip:", "belt",   "helmet_equipped", "helmet_id", "⛑️", "Шлем получен!"),
        (":boots_equip:",  "boots",  "boots_equipped",  "boots_id",  "👟", "Сапоги получены!"),
        (":shield_equip:", "shield", "shield_equipped", "shield_id", "🛡️", "Щит получен!"),
        (":ring_equip:",   "ring1",  "ring_equipped",   "ring_id",   "💍", "Кольцо получено!"),
    )
    for marker, slot, event, id_field, emoji, title in _equip_map:
        if marker not in payload:
            continue
        item_id = payload.split(marker, 1)[1].strip()
        force = (slot == "ring1")
        try:
            if force:
                await _exec(db.equip_item, uid, slot, item_id, True)
            else:
                await _exec(db.equip_item, uid, slot, item_id)
            await _exec(db.add_owned_weapon, uid, item_id)
        except Exception as e:
            _log.error("CRITICAL: recovery %s uid=%s item=%s inv=%s err=%s", event, uid, item_id, inv_id, e)
            return False
        cache_invalidate(uid)
        if manager is not None:
            await manager.send(uid, {"event": event, id_field: item_id, "source": "cryptopay"})
        await send_tg_message(uid, f"{emoji} <b>{title}</b>\nОткройте «Снаряжение» — предмет надет.\n\n⚔️ Duel Arena")
        return True

    if ":rental:" in payload:
        item_id = payload.split(":rental:", 1)[1].strip()
        try:
            ok_rent = await _exec(deliver_rental, db, uid, item_id)
            if not ok_rent:
                return False
        except Exception as e:
            _log.error("CRITICAL: recovery deliver_rental uid=%s item=%s inv=%s err=%s", uid, item_id, inv_id, e)
            return False
        cache_invalidate(uid)
        if manager is not None:
            await manager.send(uid, {"event": "rental_activated", "item_id": item_id, "source": "cryptopay"})
        await send_tg_message(uid, "⏳ <b>Аренда мифик-предмета активирована!</b>\nДействует 7 дней.\n\n⚔️ Duel Arena")
        return True

    # default: только базовое начисление алмазов (уже сделано confirm_crypto_invoice)
    if diamonds > 0:
        if manager is not None:
            await manager.send(uid, {"event": "diamonds_credited", "diamonds": diamonds, "source": "cryptopay"})
        await send_tg_message(uid, f"💎 <b>+{diamonds} алмазов зачислено!</b>\nОплата через CryptoPay подтверждена.\n\n⚔️ Duel Arena")
    return True
