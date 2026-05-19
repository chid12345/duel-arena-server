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
    """armor2_mythic1 = Доспех Пламенного Титана: +12 силы, +24 HP."""
    from db_schema.equipment_items import ARMOR2

    item = ARMOR2["armor2_mythic1"]
    assert item["str_bonus"] == 12
    assert item["hp_bonus"] == 24
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
    # Имитируем рассогласование — удаляем только owned
    conn = db.get_connection()
    conn.execute("DELETE FROM player_owned_armor2 WHERE user_id = ?", (6003,))
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
    assert stats["hp_bonus"] == 24, f"+24 HP от Доспеха Пламенного Титана: {stats}"


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
