"""tests/test_recovery_deliver.py — recovery вторичной доставки USDT-платежей.

Покрывает 7 типов, которые раньше recovery НЕ обрабатывал:
- armor_class (мифик-броня)
- weapon_equip / helmet_equip / boots_equip / shield_equip / ring_equip
- rental (аренда mythic-предмета)

Плюс идемпотентность (повторный вызов на уже выполненной выдаче — True).
"""
from __future__ import annotations

import asyncio


class _FakeManager:
    """Заглушка manager.send — собирает события в список."""

    def __init__(self) -> None:
        self.events: list[tuple[int, dict]] = []

    async def send(self, uid: int, event: dict) -> None:
        self.events.append((uid, event))


async def _noop_send_tg(uid: int, text: str) -> None:
    return None


def _noop_cache(uid: int) -> None:
    return None


def _call(db, *, uid: int, payload: str, diamonds: int = 0, mgr: _FakeManager | None = None):
    from api.payment_routes.recovery_deliver import deliver_recovery_payload
    manager = mgr if mgr is not None else _FakeManager()
    result = asyncio.run(
        deliver_recovery_payload(
            db,
            manager=manager,
            send_tg_message=_noop_send_tg,
            cache_invalidate=_noop_cache,
            loop=None,
            uid=uid,
            inv_id=1000,
            payload=payload,
            diamonds=diamonds,
        )
    )
    return result, manager


def test_recovery_armor_class_success(db):
    """Первая выдача мифик-брони через recovery → True + событие armor_class_purchased."""
    db.get_or_create_player(5001, "u_armor")

    ok, mgr = _call(db, uid=5001, payload="uid:5001:armor_class:berserker_mythic")

    assert ok is True
    assert any(e[1].get("event") == "armor_class_purchased" for e in mgr.events), (
        f"Ожидали событие armor_class_purchased, получили: {mgr.events}"
    )
    assert db.has_class(5001, "berserker_mythic") is True, "Класс должен быть выдан"


def test_recovery_armor_class_idempotent(db):
    """Повторная выдача уже купленной мифик-брони → True (msg «уже есть»)."""
    db.get_or_create_player(5002, "u_armor2")
    # Первый раз — класс куплен напрямую (мог быть через webhook ранее)
    db.purchase_class(5002, "berserker_mythic")
    assert db.has_class(5002, "berserker_mythic") is True

    # Recovery повторяет — должен вернуть True (идемпотентно)
    ok, _ = _call(db, uid=5002, payload="uid:5002:armor_class:berserker_mythic")

    assert ok is True, "Повторная выдача уже купленного класса = True (msg «уже есть»)"


def _lvl_up(db, uid: int, lvl: int) -> None:
    """Mythic-предметы имеют tier=T4 (разблокируется с 65 lv) — для recovery-тестов
    ставим максимальный уровень, как в реальной ситуации mythic-покупки."""
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = ? WHERE user_id = ?", (lvl, uid))
    conn.commit()
    conn.close()


def test_recovery_weapon_equip_success(db):
    """Recovery надевает оружие и добавляет в owned_weapons."""
    db.get_or_create_player(5003, "u_weapon")
    _lvl_up(db, 5003, 80)

    ok, mgr = _call(db, uid=5003, payload="uid:5003:weapon_equip:gs_mythic")

    assert ok is True
    eq = db.get_equipment(5003)
    assert eq.get("weapon", {}).get("item_id") == "gs_mythic"
    assert "gs_mythic" in db.get_owned_weapons(5003)
    assert any(e[1].get("event") == "weapon_equipped" for e in mgr.events)


def test_recovery_helmet_equip_success(db):
    """Recovery надевает шлем (slot=belt)."""
    db.get_or_create_player(5004, "u_helmet")
    _lvl_up(db, 5004, 80)

    ok, mgr = _call(db, uid=5004, payload="uid:5004:helmet_equip:helmet_mythic1")

    assert ok is True
    eq = db.get_equipment(5004)
    assert eq.get("belt", {}).get("item_id") == "helmet_mythic1"
    assert any(e[1].get("event") == "helmet_equipped" for e in mgr.events)


def test_recovery_ring_equip_uses_force(db):
    """Кольцо приходит в ring1 даже если ring1 был занят (force=True для платных)."""
    db.get_or_create_player(5005, "u_ring")
    _lvl_up(db, 5005, 80)
    # Занимаем ring1 чем-то другим
    db.equip_item(5005, "ring1", "ring_free1")

    ok, _ = _call(db, uid=5005, payload="uid:5005:ring_equip:ring_mythic1")

    assert ok is True
    eq = db.get_equipment(5005)
    assert eq.get("ring1", {}).get("item_id") == "ring_mythic1", (
        "force=True — новое кольцо вытесняет старое в ring1"
    )


def test_recovery_rental_success(db):
    """Recovery активирует аренду mythic-предмета."""
    db.get_or_create_player(5006, "u_rent")
    _lvl_up(db, 5006, 80)

    ok, mgr = _call(db, uid=5006, payload="uid:5006:rental:helmet_mythic1")

    assert ok is True
    assert db.has_active_rental(5006, "helmet_mythic1") is True
    assert any(e[1].get("event") == "rental_activated" for e in mgr.events)


def test_recovery_armor_equip_success(db):
    """Этап 8: recovery надевает мифик-броню (slot=armor) и добавляет в owned."""
    db.get_or_create_player(5008, "u_armor_eq")
    _lvl_up(db, 5008, 80)

    ok, mgr = _call(db, uid=5008, payload="uid:5008:armor_equip:armor_mythic1")

    assert ok is True
    eq = db.get_equipment(5008)
    assert eq.get("armor", {}).get("item_id") == "armor_mythic1", (
        f"Ожидали armor_mythic1 в слоте armor, получили {eq}"
    )
    assert "armor_mythic1" in db.get_owned_armor(5008), (
        "Броня должна быть в player_owned_armor (отдельная таблица от owned_weapons)"
    )
    assert any(e[1].get("event") == "armor_equipped" for e in mgr.events)


def test_recovery_armor_equip_rental_rental_appears_in_active_rentals(db):
    """Аренда мифик-брони → list_active_rentals возвращает её, бейдж в UI."""
    db.get_or_create_player(5009, "u_armor_rent")
    _lvl_up(db, 5009, 80)

    ok, _ = _call(db, uid=5009, payload="uid:5009:rental:armor_mythic1")

    assert ok is True
    rentals = db.list_active_rentals(5009)
    assert any(r["item_id"] == "armor_mythic1" for r in rentals), (
        f"Аренда armor_mythic1 должна быть в active_rentals: {rentals}"
    )
    eq = db.get_equipment(5009)
    assert eq.get("armor", {}).get("item_id") == "armor_mythic1", (
        "После аренды броня должна быть надета в слот armor"
    )


def test_recovery_unknown_payload_returns_true(db):
    """Неизвестный payload без маркеров → True (только базовые алмазы)."""
    db.get_or_create_player(5007, "u_unknown")

    ok, _ = _call(db, uid=5007, payload="uid:5007:nothing_here", diamonds=10)

    assert ok is True, "Default-ветка: только событие diamonds_credited, возврат True"
