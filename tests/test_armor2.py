"""tests/test_armor2.py — новый чистый слот armor2 (после сноса старого armor).

Покрывает:
- 16 предметов в каталоге с правильными статами/слотом
- player_owned_armor2 (add/get/is_owned)
- armor2_custom_mods CRUD + создание Легендарной +19 свободных статов
- ВАЖНО: create_legendary_armor2 чинит рассогласование owned/mods
  (регрессия бага старого armor — мы воспроизводим тот же сценарий и
  проверяем что новый код устойчив).
- get_equipment_stats подмешивает кастомку armor2_mythic4 только после apply
- Сэт-бонусы: armor2_free1 + helmet_free1 = 2 в сете predator
"""
from __future__ import annotations


# ─────────── Каталог ───────────

def test_armor2_catalog_has_16_items():
    """Каталог armor2 содержит ровно 16 предметов (4 редкости × 4)."""
    from db_schema.equipment_items import ARMOR2

    assert len(ARMOR2) == 16
    by_rarity: dict[str, int] = {}
    for it in ARMOR2.values():
        by_rarity[it["rarity"]] = by_rarity.get(it["rarity"], 0) + 1
    assert by_rarity == {"common": 4, "rare": 4, "epic": 4, "mythic": 4}


def test_armor2_mythic1_has_correct_stats():
    """armor2_mythic1 = Доспех Пламенного Титана: +12 силы, +180 HP (HP поднят 2026_05_21)."""
    from db_schema.equipment_items import ARMOR2

    item = ARMOR2["armor2_mythic1"]
    assert item["str_bonus"] == 12
    assert item["hp_bonus"] == 180
    assert item["slot"] == "armor2"


def test_armor2_mythic4_is_legendary_zero_base_stats():
    """armor2_mythic4 = легендарный слот: 0 базовых статов, free_stats=19."""
    from db_schema.equipment_items import ARMOR2

    item = ARMOR2["armor2_mythic4"]
    assert item.get("str_bonus", 0) == 0
    assert item.get("agi_bonus", 0) == 0
    assert item.get("intu_bonus", 0) == 0
    assert item.get("hp_bonus", 0) == 0
    assert item["free_stats"] == 19


# ─────────── player_owned_armor2 ───────────

def test_add_get_owned_armor2(db):
    """add_owned_armor2 идемпотентен."""
    db.get_or_create_player(6001, "u_armor2_own")
    db.add_owned_armor2(6001, "armor2_mythic1")
    db.add_owned_armor2(6001, "armor2_mythic1")  # дубль — игнорируется
    db.add_owned_armor2(6001, "armor2_gold1")
    owned = set(db.get_owned_armor2(6001))
    assert owned == {"armor2_mythic1", "armor2_gold1"}
    assert db.is_armor2_owned(6001, "armor2_mythic1") is True
    assert db.is_armor2_owned(6001, "armor2_free1") is False


# ─────────── Legendary armor2_mythic4 ───────────

def test_create_legendary_armor2_creates_both_tables(db):
    """create_legendary_armor2 создаёт запись и в player_owned_armor2, и в custom_mods."""
    db.get_or_create_player(6002, "u_legend2")
    ok, msg = db.create_legendary_armor2(6002)
    assert ok is True
    assert "создан" in msg
    assert db.has_legendary_armor2(6002) is True
    assert "armor2_mythic4" in db.get_owned_armor2(6002)
    mods = db.get_armor2_custom_mods(6002, "armor2_mythic4")
    assert mods is not None
    assert mods["free_stats_left"] == 19


def test_create_legendary_armor2_repairs_desync(db):
    """Регрессия бага старого armor: если в custom_mods запись есть, а в
    player_owned_armor2 нет, повторный create должен починить (add ВСЕГДА)."""
    db.get_or_create_player(6003, "u_desync")
    db.create_legendary_armor2(6003)
    # Имитируем рассогласование — удаляем только owned (общая таблица, armor2_*)
    conn = db.get_connection()
    conn.execute("DELETE FROM player_owned_weapons WHERE user_id = ? AND item_id LIKE 'armor2_%'", (6003,))
    conn.commit(); conn.close()
    assert "armor2_mythic4" not in db.get_owned_armor2(6003)
    # Повторный вызов — раньше был ранний выход «уже создан», owned оставалась пустой
    ok, msg = db.create_legendary_armor2(6003)
    assert ok is False  # idempotent — mods уже есть
    assert "уже" in msg.lower()
    # Главное: рассогласование починилось
    assert "armor2_mythic4" in db.get_owned_armor2(6003), (
        "create_legendary_armor2 должен ВСЕГДА гарантировать запись в "
        "player_owned_armor2 — иначе после оплаты броня не появится в арсенале"
    )


def test_armor2_body_defense_hp_and_effects():
    """2026_05_21: броня получила защиту тела (3/6/9/15% по редкости),
    поднятый HP (40/75/120/180), №3 анти-крит, №4 глобальную защиту."""
    from db_schema.equipment_items import ARMOR2

    # Защита тела по редкости
    assert ARMOR2["armor2_free1"]["body_def_pct"] == 0.03
    assert ARMOR2["armor2_gold1"]["body_def_pct"] == 0.06
    assert ARMOR2["armor2_dia1"]["body_def_pct"] == 0.09
    assert ARMOR2["armor2_mythic1"]["body_def_pct"] == 0.15
    # HP поднят в ряд с другими слотами
    assert ARMOR2["armor2_free1"]["hp_bonus"] == 40
    assert ARMOR2["armor2_mythic1"]["hp_bonus"] == 180
    # №3 (магическая) — анти-крит, mythic 15% (урезан с 22 по просьбе)
    assert ARMOR2["armor2_mythic3"]["crit_resist_pct"] == 15
    assert ARMOR2["armor2_free3"]["crit_resist_pct"] == 3
    # №4 (баланс) — фиксированная (глобальная) защита, как у щита/шлема
    assert ARMOR2["armor2_dia4"]["def_pct"] == 0.06
    assert ARMOR2["armor2_free4"]["def_pct"] == 0.02
    # Легендарка (mythic4) — тоже броня, тоже защищает тело −15% (как остальные мифики)
    assert ARMOR2["armor2_mythic4"]["body_def_pct"] == 0.15
    assert ARMOR2["armor2_mythic4"].get("free_stats") == 19


def test_player_api_exposes_armor2_defense_fields():
    """eq_stats в /api/player отдаёт защиту тела/шипы/блок — иначе фронт не покажет числом."""
    from api.tma_player_api import _player_api
    r = _player_api({"user_id": 1}, eq_stats={"body_def_pct": 0.15, "reflect_pct": 15, "block_chance": 12})
    assert r["eq_stats"]["body_def_pct"] == 15.0
    assert r["eq_stats"]["reflect_pct"] == 15
    assert r["eq_stats"]["block_chance"] == 12


def test_armor2_body_def_aggregates_in_equipment_stats(db):
    """body_def_pct надетой брони попадает в get_equipment_stats."""
    db.get_or_create_player(6096, "u_bodydef")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (6096,))
    conn.commit(); conn.close()
    db.add_owned_armor2(6096, "armor2_mythic1")
    db.equip_item(6096, "armor2", "armor2_mythic1", force=True)
    stats = db.get_equipment_stats(6096)
    assert stats.get("body_def_pct") == 0.15
    assert stats.get("hp_bonus", 0) >= 180


def test_armor2_lives_in_shared_weapons_table(db):
    """2026_05_20: КОНЕЦ ДУАЛИЗМА. Броня хранится в общей player_owned_weapons
    (как все 5 слотов), но get_owned_armor2/get_owned_weapons разделены фильтром.
    Поэтому общий сброс (DELETE FROM player_owned_weapons) теперь чистит и броню —
    раньше она оставалась в отдельной таблице и сброс её забывал."""
    db.get_or_create_player(6098, "u_shared")
    db.add_owned_weapon(6098, "weapon_mythic1")
    db.add_owned_armor2(6098, "armor2_mythic1")
    db.add_owned_armor2(6098, "armor2_mythic4")

    # Разделение: оружие не содержит броню, броня = только armor2_*
    assert "armor2_mythic1" not in db.get_owned_weapons(6098)
    assert set(db.get_owned_armor2(6098)) == {"armor2_mythic1", "armor2_mythic4"}
    assert db.is_armor2_owned(6098, "armor2_mythic1") is True

    # Имитация общего сброса (как debug wipe): чистим общую таблицу.
    conn = db.get_connection()
    conn.execute("DELETE FROM player_owned_weapons WHERE user_id = ?", (6098,))
    conn.commit(); conn.close()

    # Теперь пусто И у оружия, И у брони — броня больше не «выживает» отдельно.
    assert db.get_owned_weapons(6098) == []
    assert db.get_owned_armor2(6098) == []


def test_state_lazy_creates_mods_when_owned_but_no_mods(db, monkeypatch):
    """v2.22.14: USDT-покупка идёт через общий :armor2_equip:armor2_mythic4 →
    webhook кладёт броню только в player_owned_armor2 (как у всех других mythic).
    Запись armor2_custom_mods (для +19 свободных статов) должна быть создана
    лениво при первом вызове /api/equipment/armor2_legendary_state.
    """
    from api.armor2_legendary_routes import _state as _routes_state
    import api.armor2_legendary_routes as _routes_mod
    monkeypatch.setattr(_routes_mod, "db", db)

    db.get_or_create_player(6099, "u_lazy_state")
    db.add_owned_armor2(6099, "armor2_mythic4")
    # Запись armor2_custom_mods ещё НЕ создана:
    assert db.get_armor2_custom_mods(6099, "armor2_mythic4") is None

    state = _routes_state(6099)
    assert state["owned"] is True
    assert state["armor2_mods"] is not None, "lazy-init должен был создать armor2_custom_mods"
    assert state["armor2_mods"]["free_stats_left"] == 19


def test_train_untrain_legendary_armor2_stat(db):
    """Распределение и снятие свободных статов."""
    db.get_or_create_player(6004, "u_train")
    db.create_legendary_armor2(6004)
    ok, _, mods = db.train_legendary_armor2_stat(6004, "strength")
    assert ok is True
    assert mods["str_bonus"] == 1
    assert mods["free_stats_left"] == 18
    ok, _, mods = db.untrain_legendary_armor2_stat(6004, "strength")
    assert ok is True
    assert mods["str_bonus"] == 0
    assert mods["free_stats_left"] == 19


def test_apply_legendary_armor2_locks_changes(db):
    """После apply нельзя менять статы — нужен reset."""
    db.get_or_create_player(6005, "u_apply")
    db.create_legendary_armor2(6005)
    for _ in range(19):
        db.train_legendary_armor2_stat(6005, "strength")
    db.set_legendary_armor2_passive(6005, "damage_pct")
    ok, msg, mods = db.apply_legendary_armor2_stats(6005)
    assert ok is True
    assert mods["applied"] is True
    # Попытка изменить — заблокирована
    ok, msg, _ = db.train_legendary_armor2_stat(6005, "agility")
    assert ok is False
    assert "сброс" in msg.lower()


def test_reset_legendary_armor2_returns_points(db):
    """reset возвращает все 19 очков в пул и обнуляет applied."""
    db.get_or_create_player(6006, "u_reset")
    db.create_legendary_armor2(6006)
    for _ in range(19):
        db.train_legendary_armor2_stat(6006, "agility")
    db.set_legendary_armor2_passive(6006, "double_hit")
    db.apply_legendary_armor2_stats(6006)
    db.reset_legendary_armor2(6006)
    mods = db.get_armor2_custom_mods(6006, "armor2_mythic4")
    assert mods["agi_bonus"] == 0
    assert mods["free_stats_left"] == 19
    assert mods["applied"] is False
    assert mods["passive_type"] is None


# ─────────── Статы → бой ───────────

def test_armor2_stats_flow_to_get_equipment_stats(db):
    """Обычная armor2 (не mythic4): str_bonus автоматически суммируется."""
    db.get_or_create_player(6007, "u_stats")
    # Прокачаем уровень чтобы T1 был доступен
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (6007,))
    conn.commit(); conn.close()
    db.equip_item(6007, "armor2", "armor2_mythic1", force=True)
    db.add_owned_armor2(6007, "armor2_mythic1")
    stats = db.get_equipment_stats(6007)
    assert stats["str_bonus"] == 12, f"+12 силы от Доспеха Пламенного Титана: {stats}"
    assert stats["hp_bonus"] == 180, f"+180 HP от Доспеха Пламенного Титана (HP поднят): {stats}"


def test_armor2_buy_two_keeps_both_in_arsenal(db):
    """Регрессия: купил armor2_gold1 → купил armor2_gold2 → ОБА в арсенале.
    Раньше /api/equipment/equip писал armor2 в player_owned_weapons (не туда),
    из-за чего первая броня «пропадала» после покупки второй (player_equipment
    UPSERT перезаписывал слот, owned-копии не было)."""
    # Имитируем что endpoint /api/equipment/equip делает после фикса —
    # покупка должна писать в player_owned_armor2, не в player_owned_weapons.
    db.get_or_create_player(6030, "u_buy_two")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80, gold = 100000 WHERE user_id = ?", (6030,))
    conn.commit(); conn.close()

    # Купили первую rare-броню (имитация endpoint: списать gold + add_owned_armor2 + equip)
    db.add_owned_armor2(6030, "armor2_gold1")
    db.equip_item(6030, "armor2", "armor2_gold1", force=True)
    assert "armor2_gold1" in db.get_owned_armor2(6030)

    # Купили вторую rare-броню
    db.add_owned_armor2(6030, "armor2_gold2")
    db.equip_item(6030, "armor2", "armor2_gold2", force=True)

    # ОБЕ должны быть в арсенале (player_owned_armor2)
    owned = set(db.get_owned_armor2(6030))
    assert owned == {"armor2_gold1", "armor2_gold2"}, (
        f"Купленные брони должны сохраняться в арсенале: {owned}"
    )
    # Надета — последняя
    eq = db.get_equipment(6030)
    assert eq.get("armor2", {}).get("item_id") == "armor2_gold2"

    # player_owned_weapons НЕ должна содержать armor2_* (отдельная таблица)
    weapons = set(db.get_owned_weapons(6030))
    assert not any(w.startswith("armor2_") for w in weapons), (
        f"armor2_* НЕ должны попадать в player_owned_weapons: {weapons}"
    )


def test_armor2_rental_7_days_universal_deliver(db):
    """Аренда armor2: deliver_rental универсально берёт slot из item.slot.
    Раньше у старого armor требовалась отдельная ветка с add_owned_armor —
    у armor2 этого костыля нет, slot='armor2' работает через общий путь."""
    from api.payment_routes.rental_deliver import deliver_rental
    from economy.rental_pricing import RENTAL_DURATION_DAYS

    db.get_or_create_player(6020, "u_rental_a2")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (6020,))
    conn.commit(); conn.close()

    assert RENTAL_DURATION_DAYS == 7, "Срок аренды должен быть 7 дней"

    ok = deliver_rental(db, 6020, "armor2_mythic1")
    assert ok is True, "deliver_rental должен вернуть True для armor2_mythic1"
    # Должна появиться в active_rentals
    rentals = db.list_active_rentals(6020)
    assert any(r["item_id"] == "armor2_mythic1" for r in rentals), (
        f"Аренда armor2_mythic1 должна быть в active_rentals: {rentals}"
    )
    # Должна быть надета в slot='armor2'
    eq = db.get_equipment(6020)
    assert eq.get("armor2", {}).get("item_id") == "armor2_mythic1", (
        f"После аренды броня должна быть надета в slot='armor2': {eq}"
    )


def test_armor2_rental_stars_payload_via_shop_equip_stars(db, monkeypatch):
    """Stars-payload `rental_stars:UID:armor2_mythic2` активирует аренду через
    handle_stars_equip_payload (унифицировано с helmet/weapon/etc)."""
    import handlers.commands.shop_equip_stars as mod
    monkeypatch.setattr(mod, "db", db)

    db.get_or_create_player(6021, "u_rental_stars_a2")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (6021,))
    conn.commit(); conn.close()

    msg = mod.handle_stars_equip_payload(6021, "rental_stars:6021:armor2_mythic2", 133)
    assert msg is not None and "Аренда" in msg
    rentals = db.list_active_rentals(6021)
    assert any(r["item_id"] == "armor2_mythic2" for r in rentals), (
        "Аренда должна появиться после Stars-payload"
    )
    eq = db.get_equipment(6021)
    assert eq.get("armor2", {}).get("item_id") == "armor2_mythic2"


def test_armor2_legendary_passive_reads_via_db(db):
    """get_equipped_legendary_armor2_passive возвращает passive_type ТОЛЬКО
    когда armor2_mythic4 надет И applied=1. Этим значением battle_find
    и /api/player подмешивают player['usdt_passive_type'], а battle_system
    (damage.py / damage_armor.py) применяет его в бою."""
    db.get_or_create_player(6010, "u_passive_battle")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (6010,))
    conn.commit(); conn.close()

    # 1. Без брони — пусто
    assert db.get_equipped_legendary_armor2_passive(6010) == ""

    # 2. Только создали — applied=False, пусто
    db.create_legendary_armor2(6010)
    db.equip_item(6010, "armor2", "armor2_mythic4", force=True)
    assert db.get_equipped_legendary_armor2_passive(6010) == ""

    # 3. Разложили статы + пассивка, но НЕ apply — пусто
    for _ in range(19):
        db.train_legendary_armor2_stat(6010, "intuition")
    db.set_legendary_armor2_passive(6010, "crit_dmg_pct")
    assert db.get_equipped_legendary_armor2_passive(6010) == ""

    # 4. Apply — пассивка появляется
    db.apply_legendary_armor2_stats(6010)
    assert db.get_equipped_legendary_armor2_passive(6010) == "crit_dmg_pct"

    # 5. Сняли броню — пусто (нет в equipped armor2)
    db.unequip_item(6010, "armor2")
    assert db.get_equipped_legendary_armor2_passive(6010) == ""


def test_armor2_mythic4_custom_mods_only_after_apply(db):
    """Кастомка armor2_mythic4 не даёт стат пока не зафиксирована."""
    db.get_or_create_player(6008, "u_legend_stats")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 80 WHERE user_id = ?", (6008,))
    conn.commit(); conn.close()
    db.create_legendary_armor2(6008)
    db.equip_item(6008, "armor2", "armor2_mythic4", force=True)
    # Распределили 10 в силу, но НЕ зафиксировали
    for _ in range(10):
        db.train_legendary_armor2_stat(6008, "strength")
    stats = db.get_equipment_stats(6008)
    assert stats["str_bonus"] == 0, "До apply стат не применяется"

    # Распределили остальные 9 и зафиксировали
    for _ in range(9):
        db.train_legendary_armor2_stat(6008, "agility")
    db.set_legendary_armor2_passive(6008, "armor_pct")
    db.apply_legendary_armor2_stats(6008)
    stats = db.get_equipment_stats(6008)
    assert stats["str_bonus"] == 10, f"После apply 10 силы применилось: {stats}"
    assert stats["agi_bonus"] == 9, f"9 ловкости применилось: {stats}"
