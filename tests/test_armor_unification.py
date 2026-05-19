"""tests/test_armor_unification.py — финальная унификация slot=armor с 5 другими.

Покрывает:
- Stars-payload armor_equip_stars: проходит unified-путь (add_owned_armor + equip + current_class)
- USDT: webhook _equip_map обрабатывает :armor_equip:
- equip_item('armor', X) синхронизирует players.current_class из legacy_class_id
- unequip_item('armor') обнуляет current_class
- purchase_class больше не делает delta-stat-апдейт (двойной счёт устранён)
- /api/player возвращает rental:{...} в каждом слоте, где item_id арендован
"""
from __future__ import annotations


# ─────────── Stars-путь покупки постоянной мифик-брони ───────────

def test_stars_armor_equip_unified_path(db, monkeypatch):
    """armor_equip_stars: → equip_item('armor', force=True) + add_owned_armor + current_class."""
    import handlers.commands.shop_equip_stars as mod
    monkeypatch.setattr(mod, "db", db)

    db.get_or_create_player(4001, "u_stars_armor")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (4001,))
    conn.commit()
    conn.close()

    msg = mod.handle_stars_equip_payload(4001, "armor_equip_stars:4001:armor_mythic1", 590)

    assert msg is not None and "Мифический" in msg, f"payload не обработан: {msg!r}"
    # owned пишется в player_owned_armor (не player_owned_weapons)
    assert "armor_mythic1" in db.get_owned_armor(4001)
    # равно надета
    eq = db.get_equipment(4001)
    assert eq["armor"]["item_id"] == "armor_mythic1"
    # players.current_class авто-синхронизирован с legacy_class_id
    conn = db.get_connection()
    row = conn.execute("SELECT current_class FROM players WHERE user_id = ?", (4001,)).fetchone()
    conn.close()
    assert row["current_class"] == "berserker_mythic"


# ─────────── armor_class_stars: теперь только legendary_usdt ───────────

def test_stars_armor_class_legacy_blocked_for_non_legendary(db, monkeypatch):
    """`armor_class_stars:berserker_mythic` → deprecated, не покупается через legacy path."""
    import handlers.commands.shop_equip_stars as mod
    monkeypatch.setattr(mod, "db", db)

    db.get_or_create_player(4002, "u_legacy_block")

    msg = mod.handle_stars_equip_payload(4002, "armor_class_stars:4002:berserker_mythic", 590)

    assert msg is not None
    assert "не поддерживается" in msg or "обновить" in msg
    # Через legacy не должна была создаться legendary запись.
    assert db.has_legendary_armor(4002) is False


def test_stars_legendary_reset_via_payload(db, monkeypatch):
    """`legendary_reset_stars:UID:armor_mythic4` сбрасывает armor_custom_mods."""
    import handlers.commands.shop_equip_stars as mod
    monkeypatch.setattr(mod, "db", db)

    db.get_or_create_player(4090, "u_reset_stars")
    # Создать Легендарную и сделать сборку «зафиксированной»
    db.create_legendary_armor(4090)
    # Распределить статы, выбрать пассивку, зафиксировать
    for _ in range(19):
        db.train_legendary_stat(4090, "strength")
    db.set_legendary_passive(4090, "damage_pct")
    db.apply_legendary_stats(4090)

    mods_before = db.get_armor_custom_mods(4090, "armor_mythic4")
    assert mods_before["applied"] is True
    assert mods_before["str_bonus"] == 19
    assert mods_before["free_stats_left"] == 0

    # Stars-сброс через payload
    msg = mod.handle_stars_equip_payload(4090, "legendary_reset_stars:4090:armor_mythic4", 400)

    assert msg is not None and "сброшены" in msg
    mods_after = db.get_armor_custom_mods(4090, "armor_mythic4")
    assert mods_after["applied"] is False
    assert mods_after["str_bonus"] == 0
    assert mods_after["free_stats_left"] == 19
    assert mods_after["passive_type"] is None


def test_stars_armor_class_legendary_usdt_still_works(db, monkeypatch):
    """`armor_class_stars:legendary_usdt` → создаёт Легендарную броню (armor_custom_mods)."""
    import handlers.commands.shop_equip_stars as mod
    monkeypatch.setattr(mod, "db", db)

    db.get_or_create_player(4003, "u_legendary")

    msg = mod.handle_stars_equip_payload(4003, "armor_class_stars:4003:legendary_usdt", 0)

    assert msg is not None and "Легендарный" in msg
    assert db.has_legendary_armor(4003) is True
    mods = db.get_armor_custom_mods(4003, "armor_mythic4")
    assert mods is not None
    assert mods["free_stats_left"] == 19, "новая legendary должна стартовать с 19 свободных статов"


def test_create_legendary_armor_repairs_desync(db):
    """Регрессия: если armor_custom_mods запись есть, а в player_owned_armor нет
    (рассогласование после прерванной доставки / старого wipe), повторный вызов
    create_legendary_armor должен починить — добавить запись в player_owned_armor.

    Иначе игрок оплачивает $11.99, видит «куплено», но броня не появляется
    в арсенале (фронт читает owned_armor)."""
    db.get_or_create_player(4099, "u_desync")

    # 1. Создаём legendary нормально — обе записи появляются
    ok, _ = db.create_legendary_armor(4099)
    assert ok is True
    assert "armor_mythic4" in db.get_owned_armor(4099)
    assert db.has_legendary_armor(4099) is True

    # 2. Имитируем рассогласование — удаляем ТОЛЬКО player_owned_armor
    conn = db.get_connection()
    conn.execute("DELETE FROM player_owned_armor WHERE user_id = ?", (4099,))
    conn.commit()
    conn.close()
    assert "armor_mythic4" not in db.get_owned_armor(4099)
    assert db.has_legendary_armor(4099) is True  # mods остались

    # 3. Повторный вызов — раньше тут был ранний выход (False, "уже создан"),
    #    player_owned_armor оставалась пустой и броня не появлялась в арсенале.
    ok, msg = db.create_legendary_armor(4099)
    assert ok is False  # "уже создан" — идемпотентность ок
    assert "уже" in msg.lower()
    # Главное: рассогласование починилось
    assert "armor_mythic4" in db.get_owned_armor(4099), (
        "create_legendary_armor должен ВСЕГДА гарантировать запись в "
        "player_owned_armor — иначе после оплаты броня не появится в арсенале"
    )


# ─────────── equip_item('armor') sync current_class ───────────

def test_equip_armor_syncs_current_class(db):
    """equip_item('armor', armor_gold1) → players.current_class = berserker_gold."""
    db.get_or_create_player(4010, "u_sync")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 25 WHERE user_id = ?", (4010,))
    conn.commit()
    conn.close()

    ok = db.equip_item(4010, "armor", "armor_gold1", force=True)
    assert ok is True

    conn = db.get_connection()
    row = conn.execute("SELECT current_class, current_class_type FROM players WHERE user_id = ?", (4010,)).fetchone()
    conn.close()
    assert row["current_class"] == "berserker_gold"
    assert row["current_class_type"] == "gold"


def test_unequip_armor_clears_current_class(db):
    """unequip_item('armor') → players.current_class = NULL."""
    db.get_or_create_player(4011, "u_unequip")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 25 WHERE user_id = ?", (4011,))
    conn.commit()
    conn.close()
    db.equip_item(4011, "armor", "armor_gold2", force=True)

    db.unequip_item(4011, "armor")

    conn = db.get_connection()
    row = conn.execute("SELECT current_class, current_class_type FROM players WHERE user_id = ?", (4011,)).fetchone()
    conn.close()
    assert row["current_class"] is None
    assert row["current_class_type"] is None


def test_switch_armor_updates_current_class(db):
    """Смена брони обновляет current_class на новый legacy_class_id."""
    db.get_or_create_player(4012, "u_switch")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 50 WHERE user_id = ?", (4012,))
    conn.commit()
    conn.close()
    db.equip_item(4012, "armor", "armor_gold1", force=True)  # berserker_gold
    db.equip_item(4012, "armor", "armor_dia2", force=True)   # shadowdancer_diamonds

    conn = db.get_connection()
    row = conn.execute("SELECT current_class FROM players WHERE user_id = ?", (4012,)).fetchone()
    conn.close()
    assert row["current_class"] == "shadowdancer_diamonds"


# ─────────── purchase_class не делает double-stat-counting ───────────

def test_purchase_armor_does_not_double_count_stats(db):
    """Покупка мифик-брони (через add_owned_armor + equip_item) не пушит delta-статы в players.

    Раньше purchase_class напрямую обновлял players.strength/endurance/crit/max_hp,
    плюс мифик-броня давала те же +N через get_equipment_stats — двойной счёт.
    Сейчас purchase_class удалён, остался только unified path.
    """
    db.get_or_create_player(4020, "u_no_double")
    conn = db.get_connection()
    row = conn.execute("SELECT strength, endurance, crit, max_hp FROM players WHERE user_id = ?", (4020,)).fetchone()
    str0, end0, crit0, hp0 = row["strength"], row["endurance"], row["crit"], row["max_hp"]
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (4020,))
    conn.commit()
    conn.close()

    # Купили armor_gold1 (str_bonus=7, hp_bonus=14) через unified path
    db.add_owned_armor(4020, "armor_gold1")
    db.equip_item(4020, "armor", "armor_gold1", force=True)

    conn = db.get_connection()
    row = conn.execute("SELECT strength, endurance, crit, max_hp FROM players WHERE user_id = ?", (4020,)).fetchone()
    conn.close()
    # players.* колонки не меняются — бонусы брони идут через get_equipment_stats.
    assert row["strength"] == str0, f"strength изменилась: {str0} → {row['strength']}"
    assert row["endurance"] == end0
    assert row["crit"] == crit0
    assert row["max_hp"] == hp0

    # А вот get_equipment_stats — должен дать +7 strength / +14 hp.
    stats = db.get_equipment_stats(4020)
    assert stats.get("str_bonus", 0) >= 7
    assert stats.get("hp_bonus", 0) >= 14


# ─────────── /api/player обогащает каждый слот rental: {expires_at, ...} ───────────

def test_api_player_returns_rental_per_slot(db):
    """`_fetch_equipment_parallel._eq` подмешивает rental: {seconds_left, days_left} к слоту."""
    from api.tma_route_player import _fetch_equipment_parallel
    db.get_or_create_player(4040, "u_api_rent")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (4040,))
    conn.commit()
    conn.close()

    db.rent_item(4040, "helmet_mythic1", days=7)
    db.equip_item(4040, "belt", "helmet_mythic1", force=True)

    eq, _weapons, _armors, _stats, _set = _fetch_equipment_parallel(db, 4040)
    assert "belt" in eq
    assert eq["belt"]["item_id"] == "helmet_mythic1"
    rental = eq["belt"].get("rental")
    assert rental is not None, f"rental missing на надетой арендованной вещи: {eq['belt']}"
    assert rental["days_left"] >= 1
    assert rental["seconds_left"] > 0


# ─────────── Авто-снятие истёкшей аренды без фантомных бонусов ───────────

def test_expired_armor_rental_auto_unequips_and_clears_class(db):
    """После истечения аренды get_equipment авто-снимает armor + обнуляет current_class.

    Защита от фантомных class-перков в бою: если аренда истекла, не должно
    остаться ни статов через get_equipment_stats, ни записи в player_equipment,
    ни значения current_class в players.
    """
    from datetime import datetime, timedelta
    db.get_or_create_player(4050, "u_expire")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (4050,))
    conn.commit()
    conn.close()

    db.rent_item(4050, "armor_mythic1", days=1)
    db.equip_item(4050, "armor", "armor_mythic1", force=True)

    # Проверяем что аренда работает: armor есть, current_class установлен
    eq = db.get_equipment(4050)
    assert "armor" in eq and eq["armor"]["item_id"] == "armor_mythic1"
    conn = db.get_connection()
    row = conn.execute("SELECT current_class FROM players WHERE user_id = ?", (4050,)).fetchone()
    conn.close()
    assert row["current_class"] == "berserker_mythic"

    # Делаем аренду истёкшей (backdate expires_at)
    past = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
    conn = db.get_connection()
    conn.execute(
        "UPDATE equipment_rentals SET expires_at = ? WHERE user_id = ? AND item_id = ?",
        (past, 4050, "armor_mythic1"),
    )
    conn.commit()
    conn.close()

    # Следующий get_equipment должен авто-снять armor (mythic, не в owned, не в active rental)
    eq2 = db.get_equipment(4050)
    assert "armor" not in eq2, "Истёкшая аренда не должна возвращать armor в equipment"

    # players.current_class должен обнулиться через unequip_item('armor')
    conn = db.get_connection()
    row = conn.execute("SELECT current_class, current_class_type FROM players WHERE user_id = ?", (4050,)).fetchone()
    conn.close()
    assert row["current_class"] is None, "current_class должен обнулиться после авто-снятия"
    assert row["current_class_type"] is None

    # get_equipment_stats не должен содержать str_bonus от armor_mythic1 (+12)
    stats = db.get_equipment_stats(4050)
    assert stats.get("str_bonus", 0) == 0
    assert stats.get("hp_bonus", 0) == 0


def test_expired_rental_no_phantom_set_bonus(db):
    """Сет-бонус не должен учитывать арендованный предмет после истечения.

    Сценарий: игрок арендует mythic-броню и mythic-щит одного архетипа.
    При активной аренде сет 2/6 даёт бонус. После истечения brony — сета
    больше нет, count для архетипа = 1.
    """
    from datetime import datetime, timedelta
    from repositories.sets import resolve_active_sets
    db.get_or_create_player(4051, "u_set_phantom")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (4051,))
    conn.commit()
    conn.close()

    # Арендуем 2 предмета одного архетипа
    db.rent_item(4051, "armor_mythic1", days=1)
    db.equip_item(4051, "armor", "armor_mythic1", force=True)
    db.rent_item(4051, "shield_mythic1", days=1)
    db.equip_item(4051, "shield", "shield_mythic1", force=True)

    eq = db.get_equipment(4051)
    armor_set = eq["armor"].get("set_id")
    shield_set = eq["shield"].get("set_id")
    # Если архетипы совпадают — сет активен (2/6).
    if armor_set and shield_set and armor_set == shield_set:
        actives = resolve_active_sets(eq)
        active_set = next((s for s in actives if s["set_id"] == armor_set), None)
        assert active_set is not None and active_set["count"] == 2

    # Истекает аренда armor
    past = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
    conn = db.get_connection()
    conn.execute(
        "UPDATE equipment_rentals SET expires_at = ? WHERE user_id = ? AND item_id = ?",
        (past, 4051, "armor_mythic1"),
    )
    conn.commit()
    conn.close()

    eq2 = db.get_equipment(4051)
    assert "armor" not in eq2
    # Если архетипы совпадали — count должен упасть до 1 (порог 2 не достигнут).
    if armor_set and shield_set and armor_set == shield_set:
        actives2 = resolve_active_sets(eq2)
        for s in actives2:
            assert s["count"] < 2 or s["set_id"] != armor_set, (
                f"После истечения armor сет {armor_set} не должен включать его"
            )


# ─────────── Аренда брони не теряется при смене на другую ───────────

def test_armor_rental_persists_through_switch(db):
    """Арендовал armor_mythic1 → надел armor_gold1 → аренда mythic1 всё ещё активна."""
    db.get_or_create_player(4030, "u_rent_persist")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (4030,))
    conn.commit()
    conn.close()

    # Покупаем аренду через тот же helper, что и Stars-handler
    db.rent_item(4030, "armor_mythic1", days=7, stars_paid=100)
    db.equip_item(4030, "armor", "armor_mythic1", force=True)
    db.add_owned_armor(4030, "armor_mythic1")  # обычно делается deliver_rental

    # Переключились на gold-броню
    db.equip_item(4030, "armor", "armor_gold1", force=True)

    # Аренда mythic1 должна сохраниться в equipment_rentals
    assert db.has_active_rental(4030, "armor_mythic1") is True
    rentals = db.list_active_rentals(4030)
    assert any(r["item_id"] == "armor_mythic1" for r in rentals)
