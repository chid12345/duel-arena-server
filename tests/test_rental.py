"""tests/test_rental.py — аренда mythic-снаряжения (Этап 8 редизайна).

Покрывает:
- rental_stars_price: 50% от mythic-цены
- rent_item: создаёт запись, has_active=True
- продление: повторная аренда добавляет дни к expires_at
- cleanup_expired_rentals: удаляет истёкшие
- bot handler `rental_stars:` → аренда + equip
"""
from __future__ import annotations

from datetime import datetime, timedelta


def test_rental_pricing_fixed_constants():
    """Этап 8 + выравнивание под официальный курс Telegram (1$ ≈ 67⭐):
    133⭐ или $2 для любого mythic, независимо от цены покупки."""
    from economy.rental_pricing import (
        RENTAL_DURATION_DAYS,
        RENTAL_PRICE_STARS,
        RENTAL_PRICE_USDT,
    )
    assert RENTAL_PRICE_STARS == 133
    assert RENTAL_PRICE_USDT == "2.00"
    assert RENTAL_DURATION_DAYS == 7


def test_deliver_rental_usdt_flow(db):
    """deliver_rental помещает аренду и надевает предмет (используется в 3 USDT-путях)."""
    from api.payment_routes.rental_deliver import deliver_rental, parse_rental_payload

    db.get_or_create_player(3010, "u_usdt_rent")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (3010,))
    conn.commit()
    conn.close()

    item_id = parse_rental_payload("uid:3010:rental:shield_mythic1")
    assert item_id == "shield_mythic1"

    ok = deliver_rental(db, 3010, item_id)

    assert ok is True
    assert db.has_active_rental(3010, "shield_mythic1") is True
    eq = db.get_equipment(3010)
    assert eq["shield"]["item_id"] == "shield_mythic1"


def test_rent_item_creates_active_rental(db):
    """rent_item → has_active_rental=True + список содержит запись."""
    db.get_or_create_player(3001, "r1")

    res = db.rent_item(3001, "helmet_mythic1", days=7, stars_paid=295)

    assert res["ok"] is True
    assert db.has_active_rental(3001, "helmet_mythic1") is True
    items = db.list_active_rentals(3001)
    ids = {r["item_id"] for r in items}
    assert "helmet_mythic1" in ids


def test_rent_extension_stacks(db, monkeypatch):
    """Повторная аренда продлевает: 7 + 7 = 14 дней с почти таким же expires_at.

    Отключаем тестовый минутный override, чтобы проверить штатный режим в днях.
    """
    import economy.rental_pricing as _rp
    monkeypatch.setattr(_rp, "RENTAL_DURATION_TEST_OVERRIDE_MINUTES", None)

    db.get_or_create_player(3002, "r2")
    db.rent_item(3002, "shield_mythic1", days=7, stars_paid=295)

    db.rent_item(3002, "shield_mythic1", days=7, stars_paid=295)

    items = db.list_active_rentals(3002)
    item = next((i for i in items if i["item_id"] == "shield_mythic1"), None)
    assert item is not None
    days_left = item["seconds_left"] / 86400
    assert 13 <= days_left <= 14, f"Ожидали ~14 дн., получили {days_left:.2f}"


def test_cleanup_expired_rentals(db):
    """cleanup_expired_rentals удаляет истёкшие, оставляет активные."""
    db.get_or_create_player(3003, "r3")
    db.rent_item(3003, "helmet_mythic1", days=7)
    db.rent_item(3003, "shield_mythic1", days=7)
    # Делаем helmet истёкшим
    past = (datetime.utcnow() - timedelta(days=1)).isoformat()
    conn = db.get_connection()
    conn.execute(
        "UPDATE equipment_rentals SET expires_at = ? WHERE user_id = ? AND item_id = ?",
        (past, 3003, "helmet_mythic1"),
    )
    conn.commit()
    conn.close()

    deleted = db.cleanup_expired_rentals(3003)

    assert deleted == 1
    assert db.has_active_rental(3003, "helmet_mythic1") is False
    assert db.has_active_rental(3003, "shield_mythic1") is True


def test_bot_handler_rental_payload_rents_and_equips(db, monkeypatch):
    """payload `rental_stars:uid:item_id` → аренда создана + предмет надет."""
    import handlers.commands.shop_equip_stars as mod
    monkeypatch.setattr(mod, "db", db)
    db.get_or_create_player(3004, "r4")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (3004,))
    conn.commit()
    conn.close()

    msg = mod.handle_stars_equip_payload(3004, "rental_stars:3004:helmet_mythic1", 295)

    assert msg is not None and "Аренда" in msg
    assert db.has_active_rental(3004, "helmet_mythic1") is True
    eq = db.get_equipment(3004)
    assert eq["belt"]["item_id"] == "helmet_mythic1"
