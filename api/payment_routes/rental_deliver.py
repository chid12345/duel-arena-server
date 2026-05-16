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

        # Унификация armor: у брони базовые статы (str/end/crit/max_hp) идут
        # delta-моделью через switch_class. equip_item этого не делает.
        # Решение для арендованной брони — purchase_class регистрирует класс
        # бесплатно (mythic-классы имеют price_gold=0, price_diamonds=0),
        # затем switch_class применяет delta-статы. Работает и на SQLite,
        # и на Postgres — без сырого INSERT OR IGNORE (SQLite-only).
        if slot == "armor":
            legacy_class = item.get("legacy_class_id")
            if legacy_class:
                try:
                    if not db.has_class(int(owner_uid), legacy_class):
                        ok_p, msg_p = db.purchase_class(int(owner_uid), legacy_class)
                        if not ok_p:
                            _log.warning(
                                "deliver_rental: purchase_class failed uid=%s class=%s msg=%s",
                                owner_uid, legacy_class, msg_p,
                            )
                    ok_s, msg_s = db.switch_class(int(owner_uid), legacy_class)
                    if not ok_s:
                        _log.warning(
                            "deliver_rental: switch_class failed uid=%s class=%s msg=%s",
                            owner_uid, legacy_class, msg_s,
                        )
                except Exception as ce:
                    _log.error(
                        "deliver_rental: armor class apply failed uid=%s class=%s err=%s",
                        owner_uid, legacy_class, ce,
                    )
        return True
    except Exception as e:
        _log.error(
            "CRITICAL: deliver_rental failed uid=%s item=%s err=%s",
            owner_uid, item_id, e,
        )
        return False
