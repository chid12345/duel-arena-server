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


def test_equip_blocks_t4_for_low_level_player(db):
    """Этап 3E: серверная защита — игрок 10 ур. НЕ может надеть T4-вещь."""
    db.get_or_create_player(2001, "u_low")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 10 WHERE user_id = ?", (2001,))
    conn.commit()
    conn.close()

    # T4 разблокируется с 65 ур. — на 10-м должен быть отказ
    ok = db.equip_item(2001, "belt", "helmet_mythic1")

    assert ok is False, "T4 на 10 ур. — equip_item должен вернуть False"
    eq = db.get_equipment(2001)
    assert "belt" not in eq, "Слот belt не должен быть заполнен"


def test_equip_t4_works_at_max_level(db):
    """На 80 ур. T4-вещь надевается без проблем (если куплена)."""
    db.get_or_create_player(2002, "u_high")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (2002,))
    conn.commit()
    conn.close()
    # Этап 8: mythic надевается только если куплено или арендовано
    db.add_owned_weapon(2002, "helmet_mythic1")

    ok = db.equip_item(2002, "belt", "helmet_mythic1")

    assert ok is True
    eq = db.get_equipment(2002)
    assert eq["belt"]["item_id"] == "helmet_mythic1"


def test_equip_force_bypasses_tier_block(db):
    """force=True — для платных Stars/USDT покупок — обходит tier-блок.
    Игрок уже заплатил, отказывать нельзя."""
    db.get_or_create_player(2003, "u_paid")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 10 WHERE user_id = ?", (2003,))
    conn.commit()
    conn.close()
    # Этап 8: stars-покупка добавляет в owned перед equip
    db.add_owned_weapon(2003, "helmet_mythic1")

    # T4 за Stars (force=True) — даже на 10 ур. должно надеться
    ok = db.equip_item(2003, "belt", "helmet_mythic1", force=True)

    assert ok is True, "force=True должен пропустить tier-блок"
    eq = db.get_equipment(2003)
    assert eq["belt"]["item_id"] == "helmet_mythic1"


def test_rented_mythic_can_be_equipped_and_auto_unequips_on_expire(db):
    """Этап 8: аренда mythic = временный доступ.

    1. Аренда на 7 дней → mythic надевается и держится в слоте.
    2. Истечение аренды → get_equipment авто-снимает с слота.
    """
    from datetime import datetime, timedelta
    db.get_or_create_player(2010, "u_rent")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (2010,))
    conn.commit()
    conn.close()
    # Аренда 7 дней
    db.rent_item(2010, "helmet_mythic1", days=7, stars_paid=295)
    assert db.has_active_rental(2010, "helmet_mythic1") is True

    # Надеваем — для теста используем force (имитация stars-покупки flow,
    # но аренда тоже даёт право).
    ok = db.equip_item(2010, "belt", "helmet_mythic1", force=True)
    assert ok is True
    eq = db.get_equipment(2010)
    assert eq["belt"]["item_id"] == "helmet_mythic1", "Аренда — слот занят"

    # Симулируем истечение: ставим expires_at в прошлое
    past = (datetime.utcnow() - timedelta(days=1)).isoformat()
    conn = db.get_connection()
    conn.execute(
        "UPDATE equipment_rentals SET expires_at = ? WHERE user_id = ? AND item_id = ?",
        (past, 2010, "helmet_mythic1"),
    )
    conn.commit()
    conn.close()

    eq2 = db.get_equipment(2010)
    assert "belt" not in eq2, "Истёкшая аренда → слот авто-очищается"


def test_equip_legacy_item_no_tier_works(db):
    """Legacy предмет без tier (sword_iron) — проверка пропускается."""
    db.get_or_create_player(2004, "u_legacy")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 1 WHERE user_id = ?", (2004,))
    conn.commit()
    conn.close()

    ok = db.equip_item(2004, "weapon", "sword_iron")

    assert ok is True, "Legacy без tier должен надеваться без проверки"


def test_equipment_stats_with_plus_upgrade(db):
    """get_equipment_stats умножает статы на +N через plus_stats_for.

    helmet_free1: hp_bonus=60 (база). Целый шаг +2%/ур. +5 → ×1.10 = 66 HP.
    """
    db.get_or_create_player(3001, "u_plus")
    db.equip_item(3001, "belt", "helmet_free1")
    # Базовый стат
    stats_base = db.get_equipment_stats(3001)
    assert stats_base["hp_bonus"] == 60, f"База: {stats_base['hp_bonus']}"

    # Прокачиваем до +5
    for _ in range(5):
        db.record_upgrade(3001, "helmet_free1")

    stats_plus5 = db.get_equipment_stats(3001)
    # Целый шаг +2%/ур: 60 × (1 + 0.02 × 5) = 60 × 1.10 = 66
    assert stats_plus5["hp_bonus"] == 66, (
        f"+5 → ожидали 66 HP, получили {stats_plus5['hp_bonus']}"
    )


def test_equipment_stats_zero_plus_unchanged(db):
    """+0 (нет записи) → статы как у базового предмета."""
    db.get_or_create_player(3002, "u_zero")
    db.equip_item(3002, "belt", "helmet_free1")
    # Без апгрейда
    stats = db.get_equipment_stats(3002)
    assert stats["hp_bonus"] == 60


def test_equipment_stats_pct_field_with_plus(db):
    """def_pct (процент) тоже масштабируется."""
    db.get_or_create_player(3003, "u_def")
    db.equip_item(3003, "belt", "helmet_free2")  # def_pct = 0.03
    for _ in range(3):
        db.record_upgrade(3003, "helmet_free2")
    stats = db.get_equipment_stats(3003)
    # Процентный шаг +0.8%/ур: 0.03 × (1 + 0.008 × 3) = 0.03 × 1.024 = 0.0307
    assert abs(stats["def_pct"] - 0.0307) < 0.0001, (
        f"+3 def_pct: ожидали ~0.0307, получили {stats['def_pct']}"
    )


def test_ring_secondary_stats_reach_combat(db):
    """Кольцо реально даёт скорость восст./золото%/опыт% (не только на карточке).
    ring_mythic1: accuracy 18 + regen_speed_pct 10 + gold_pct 7 — всё в боевых статах."""
    db.get_or_create_player(3004, "u_ring")
    db.add_owned_weapon(3004, "ring_mythic1")  # mythic — нужно владеть, иначе снимется
    db.equip_item(3004, "ring1", "ring_mythic1", force=True)
    stats = db.get_equipment_stats(3004)
    assert stats["accuracy"] == 18
    assert stats["regen_speed_pct"] == 10
    assert stats["gold_pct"] == 7


def test_ring_secondary_stats_scale_with_plus(db):
    """Прокачка усиливает и вторичные бонусы кольца (всё %-статы — мягкий множитель)."""
    db.get_or_create_player(3005, "u_ring2")
    db.add_owned_weapon(3005, "ring_mythic1")
    db.equip_item(3005, "ring1", "ring_mythic1", force=True)
    for _ in range(5):
        db.record_upgrade(3005, "ring_mythic1")
    stats = db.get_equipment_stats(3005)
    # Процентный шаг +0.8%/ур (+5 → ×1.04): regen_speed 10→10.4, gold 7→7.28
    assert abs(stats["regen_speed_pct"] - 10.4) < 0.0001
    assert abs(stats["gold_pct"] - 7.28) < 0.0001


def test_add_owned_weapon_idempotent(db):
    """Повторный add_owned_weapon не должен создавать дубль."""
    db.get_or_create_player(1006, "u6")
    db.add_owned_weapon(1006, "sword_iron")
    db.add_owned_weapon(1006, "sword_iron")

    weapons = db.get_owned_weapons(1006)
    assert weapons.count("sword_iron") == 1, f"Должна быть одна запись, получили {weapons}"
