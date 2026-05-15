"""
tests/test_equipment.py — экипировка (player_equipment).

Покрывает:
- equip → get_equipment видит,
- unequip убирает,
- get_equipment_stats суммирует,
- авто-resolve ring1 (без force),
- ring2 при занятом ring1,
- force=True для ring1 СНИМАЕТ legacy ring2 (главный фикс),
- add_owned_weapon идемпотентен.
"""
from __future__ import annotations


def test_equip_then_get_returns_item(db):
    """После equip get_equipment должен показать предмет в слоте."""
    db.get_or_create_player(1001, "u1")

    ok = db.equip_item(1001, "weapon", "sword_iron")

    assert ok is True
    eq = db.get_equipment(1001)
    assert "weapon" in eq
    assert eq["weapon"]["item_id"] == "sword_iron"


def test_unequip_removes_item(db):
    """unequip должен удалить запись из слота."""
    db.get_or_create_player(1002, "u2")
    db.equip_item(1002, "weapon", "sword_iron")

    ok = db.unequip_item(1002, "weapon")

    assert ok is True
    assert "weapon" not in db.get_equipment(1002)


def test_get_equipment_stats_sums_atk_and_hp(db):
    """Два предмета (меч + шлем) → суммируем atk_bonus и hp_bonus."""
    db.get_or_create_player(1003, "u3")
    db.equip_item(1003, "weapon", "sword_iron")   # atk_bonus=8
    db.equip_item(1003, "belt", "helmet_free1")   # hp_bonus=60

    stats = db.get_equipment_stats(1003)

    assert stats["atk_bonus"] == 8, f"Ожидали atk_bonus=8, получили {stats['atk_bonus']}"
    assert stats["hp_bonus"] == 60, f"Ожидали hp_bonus=60, получили {stats['hp_bonus']}"


def test_ring_auto_resolves_to_ring1_then_ring2(db):
    """Первое кольцо в ring1, второе — авто в ring2."""
    db.get_or_create_player(1004, "u4")

    db.equip_item(1004, "ring1", "ring_free1")
    db.equip_item(1004, "ring1", "ring_free2")  # без force → должно уйти в ring2

    eq = db.get_equipment(1004)
    assert eq.get("ring1", {}).get("item_id") == "ring_free1", "Первое кольцо должно остаться в ring1"
    assert eq.get("ring2", {}).get("item_id") == "ring_free2", "Второе кольцо должно автоматически попасть в ring2"


def test_force_ring1_removes_legacy_ring2(db):
    """Главный фикс: force=True для ring1 СНИМАЕТ ring2 (legacy/фантом).

    UI профиля рендерит только ring1; дубль в ring2 даёт фантомные статы.
    Платные покупки (Stars/USDT) идут с force=True.
    """
    db.get_or_create_player(1005, "u5")
    db.equip_item(1005, "ring1", "ring_free1")           # → ring1
    db.equip_item(1005, "ring1", "ring_free2")           # → ring2 (авто)
    assert db.get_equipment(1005).get("ring2") is not None

    # Покупаем кольцо за реальные деньги — force=True
    db.equip_item(1005, "ring1", "ring_free3", force=True)

    eq = db.get_equipment(1005)
    assert eq["ring1"]["item_id"] == "ring_free3", "Новое кольцо в ring1"
    assert "ring2" not in eq, "ring2 должен быть удалён (legacy)"


def test_add_owned_weapon_idempotent(db):
    """Повторный add_owned_weapon не должен создавать дубль."""
    db.get_or_create_player(1006, "u6")
    db.add_owned_weapon(1006, "sword_iron")
    db.add_owned_weapon(1006, "sword_iron")

    weapons = db.get_owned_weapons(1006)
    assert weapons.count("sword_iron") == 1, f"Должна быть одна запись, получили {weapons}"
