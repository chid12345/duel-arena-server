"""Доставка USDT-аренды mythic-предметов (Этап 8 редизайна).

Вызывается из 3 путей доставки USDT:
- crypto_webhook.py — официальный CryptoPay webhook (основной)
- crypto_check.py   — клиентский polling после оплаты
- tools/recover_crypto_invoice.py — ручное восстановление

Идемпотентна: rent_item делает UPSERT, equip_item делает UPSERT.
"""
from __future__ import annotations

import logging
from typing import Any

from db_schema.equipment_catalog import get_item
from economy.rental_pricing import RENTAL_DURATION_DAYS

_log = logging.getLogger(__name__)


def parse_rental_payload(custom_payload: str) -> str:
    """Извлечь item_id из payload `uid:{uid}:rental:{item_id}`. '' если не rental."""
    if ":rental:" not in custom_payload:
        return ""
    return custom_payload.split(":rental:", 1)[1].strip()


def deliver_rental(db: Any, owner_uid: int, item_id: str) -> bool:
    """Создать/продлить аренду + надеть предмет. True если успешно."""
    item = get_item(item_id) or {}
    slot = item.get("slot", "")
    if not slot:
        _log.error("deliver_rental: unknown item_id=%s for uid=%s", item_id, owner_uid)
        return False
    try:
        db.rent_item(int(owner_uid), item_id, days=RENTAL_DURATION_DAYS)
        db.equip_item(int(owner_uid), slot, item_id, force=True)
        return True
    except Exception as e:
        _log.error(
            "CRITICAL: deliver_rental failed uid=%s item=%s err=%s",
            owner_uid, item_id, e,
        )
        return False
