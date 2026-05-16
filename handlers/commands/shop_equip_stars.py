"""Обработчик оплаты мифического снаряжения за Telegram Stars.

Отдельный модуль (выделен из shop_payments.py по Закону 1 / Закону 9).
Вся выдача снаряжения после Stars-оплаты собрана здесь — чтобы не размазывать
бизнес-логику по крупному файлу с /buy и общей диспетчеризацией платежей.

Основной вход: handle_stars_equip_payload(user_id, payload, stars) → Optional[str].
Возвращает готовый текст сообщения юзеру; None — если payload не про снаряжение
и должен обрабатываться другой веткой.
"""

from __future__ import annotations

import logging
from typing import Optional, Tuple

from database import db

logger = logging.getLogger(__name__)


# Префикс payload → slot в player_equipment.
# Payload формируется в api/*_payment_routes.py при createInvoiceLink.
# Шлем исторически хранится в слоте "belt".
_STARS_EQUIP_SLOT = {
    "weapon_equip_stars": "weapon",
    "shield_equip_stars": "shield",
    "helmet_equip_stars": "belt",
    "boots_equip_stars":  "boots",
    "ring_equip_stars":   "ring1",
}


def _parse(payload: str) -> Optional[Tuple[str, str]]:
    """`{type}_equip_stars:{uid}:{item_id}` → (slot, item_id) | None."""
    for prefix, slot in _STARS_EQUIP_SLOT.items():
        if payload.startswith(prefix + ":"):
            parts = payload.split(":", 2)
            if len(parts) == 3 and parts[2]:
                return slot, parts[2]
            return None
    return None


def handle_stars_equip_payload(user_id: int, payload: str, stars: int) -> Optional[str]:
    """Выдаёт мифический предмет и возвращает текст сообщения.

    Вызывается из successful_payment_handler. Выдача здесь критична: если
    полагаться только на mini app callback (openInvoice 'paid'), при свёрнутом
    mini app покупка теряется. Выдача идемпотентна — equip_item UPSERT'ит
    слот, add_owned_weapon INSERT ON CONFLICT DO NOTHING.

    Возвращает None, если payload не про снаряжение — вызывающий код идёт дальше
    по остальным веткам диспетчера платежей.
    """
    # Этап 8: аренда mythic — payload `rental_stars:{uid}:{item_id}`.
    # Не покупаем (не add_owned_weapon), а пишем в equipment_rentals + надеваем.
    if payload.startswith("rental_stars:"):
        parts = payload.split(":", 2)
        item_id = parts[2] if len(parts) == 3 else ""
        if not item_id:
            return None
        try:
            from db_schema.equipment_catalog import get_item as _get_item
            from economy.rental_pricing import RENTAL_DURATION_DAYS
            item = _get_item(item_id) or {}
            slot = item.get("slot", "")
            db.rent_item(user_id, item_id, days=RENTAL_DURATION_DAYS, stars_paid=stars)
            if slot:
                db.equip_item(user_id, slot, item_id, force=True)
        except Exception as exc:
            logger.error(
                "CRITICAL: Stars rental failed uid=%s item=%s stars=%s err=%s",
                user_id, item_id, stars, exc,
            )
            return (
                "⚠️ Оплата получена, но выдача аренды задержалась.\n"
                "Напишите в поддержку и укажите Telegram ID. ⚔️ Duel Arena"
            )
        from economy.rental_pricing import RENTAL_DURATION_DAYS as _DAYS
        return (
            f"✅ <b>Аренда {_DAYS} дн. оформлена — предмет надет!</b>\n"
            "Откройте игру — увидите его в снаряжении.\n\n⚔️ Duel Arena"
        )

    # Мифическая броня (класс) — выдаём класс целиком через purchase_class.
    # Идемпотентно: purchase_class вернёт (False,"У вас уже есть этот класс")
    # при повторной оплате — игрок не потеряет деньги впустую, но и дубликата не будет.
    # legendary_usdt — особый кастомный USDT-slot, создаётся через create_usdt_class.
    if payload.startswith("armor_class_stars:"):
        parts = payload.split(":", 2)
        class_id = parts[2] if len(parts) == 3 else ""
        if not class_id:
            return None
        try:
            if class_id == "legendary_usdt":
                # Кастомный USDT-slot: создаём персональный класс с +19 свободных статов.
                # На USDT-пути это идёт через crypto_webhook → create_usdt_class.
                # Stars-путь: ровно та же логика, чтобы UI кнопок был унифицирован.
                ok, msg, new_class_id = db.create_usdt_class(user_id)
                if not ok and "уже есть" not in (msg or ""):
                    logger.error("Stars legendary_usdt slot creation failed uid=%s stars=%s msg=%s",
                                 user_id, stars, msg)
                    return ("⚠️ Оплата получена, но выдача брони задержалась.\n"
                            "Напишите в поддержку и укажите Telegram ID. ⚔️ Duel Arena")
                return ("✅ <b>Легендарный образ получен!</b>\n"
                        "Откройте «Гардероб → Мой инвентарь» и настройте его.\n\n⚔️ Duel Arena")
            ok, msg = db.purchase_class(user_id, class_id)
            if not ok and "уже есть" not in msg:
                logger.error("Stars mythic armor purchase failed uid=%s class=%s stars=%s msg=%s",
                             user_id, class_id, stars, msg)
                return ("⚠️ Оплата получена, но выдача брони задержалась.\n"
                        "Напишите в поддержку и укажите Telegram ID. ⚔️ Duel Arena")
        except Exception as exc:
            logger.error("CRITICAL: Stars mythic armor exception uid=%s class=%s err=%s",
                         user_id, class_id, exc)
            return ("⚠️ Оплата получена, но выдача брони задержалась.\n"
                    "Напишите в поддержку и укажите Telegram ID. ⚔️ Duel Arena")
        return ("✅ <b>Мифическая броня получена!</b>\n"
                "Откройте «Гардероб» и наденьте её.\n\n⚔️ Duel Arena")

    parse = _parse(payload)
    if parse is None:
        return None
    slot, item_id = parse
    try:
        # force=True: для кольца — точно в ring1 (мини-апп показывает только ring1;
        # без force резолвер мог бы положить в ring2, и покупка «потерялась бы» в UI).
        db.equip_item(user_id, slot, item_id, force=True)
        db.add_owned_weapon(user_id, item_id)
    except Exception as exc:  # pragma: no cover — логируем критично для разбора
        logger.error(
            "CRITICAL: Stars equip failed uid=%s slot=%s item=%s stars=%s err=%s",
            user_id, slot, item_id, stars, exc,
        )
        return (
            "⚠️ Оплата получена, но выдача предмета задержалась.\n"
            "Напишите в поддержку и укажите Telegram ID. ⚔️ Duel Arena"
        )
    return (
        "✅ <b>Мифический предмет получен и надет!</b>\n"
        "Откройте игру — увидите его в снаряжении.\n\n⚔️ Duel Arena"
    )
