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
    parse = _parse(payload)
    if parse is None:
        return None
    slot, item_id = parse
    try:
        db.equip_item(user_id, slot, item_id)
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
