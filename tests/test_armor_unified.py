"""
tests/test_armor_unified.py — унификация слота armor с 5 другими слотами.

Коммит 1: каталог armor зарегистрирован в EQUIPMENT_CATALOG.
Коммиты 2-6: миграция данных, перевод switch_class, очистка consumers, клиент.

Здесь тесты, которые не зависят от миграций — статика каталога.
"""
from __future__ import annotations

from db_schema.equipment_catalog import EQUIPMENT_CATALOG, get_item, get_items_for_slot


# ── Коммит 1: каталог ────────────────────────────────────────────────────────

def test_armor_in_unified_catalog():
    """EQUIPMENT_CATALOG содержит armor_free1 со slot='armor' и rarity='common'."""
    item = get_item("armor_free1")
    assert item is not None, "armor_free1 должен быть в EQUIPMENT_CATALOG"
    assert item["slot"] == "armor"
    assert item["rarity"] == "common"
    assert item["name"] == "Кираса Ополченца"


def test_armor_catalog_has_16_items():
    """Каталог armor содержит ровно 16 предметов: 4 архетипа × 4 редкости."""
    armor_items = get_items_for_slot("armor")
    assert len(armor_items) == 16, f"Ожидали 16 armor-предметов, получили {len(armor_items)}"

    by_rarity: dict[str, int] = {}
    for it in armor_items:
        by_rarity[it["rarity"]] = by_rarity.get(it["rarity"], 0) + 1
    assert by_rarity == {"common": 4, "rare": 4, "epic": 4, "mythic": 4}, by_rarity


def test_armor_legacy_class_id_mapping():
    """У каждого armor есть legacy_class_id для миграции из user_inventory (коммит 2)."""
    expected = {
        "armor_free1": "tank_free",
        "armor_free2": "agile_free",
        "armor_free3": "crit_free",
        "armor_free4": "universal_free",
        "armor_gold1": "berserker_gold",
        "armor_gold2": "assassin_gold",
        "armor_gold3": "mage_gold",
        "armor_gold4": "paladin_gold",
        "armor_dia1": "dragonknight_diamonds",
        "armor_dia2": "shadowdancer_diamonds",
        "armor_dia3": "archmage_diamonds",
        "armor_dia4": "universal_diamonds",
        "armor_mythic1": "berserker_mythic",
        "armor_mythic2": "assassin_mythic",
        "armor_mythic3": "archmage_mythic",
        "armor_mythic4": "legendary_usdt",
    }
    for item_id, legacy in expected.items():
        item = get_item(item_id)
        assert item is not None, f"{item_id} не в каталоге"
        assert item.get("legacy_class_id") == legacy, f"{item_id}: ожидали legacy={legacy}, получили {item.get('legacy_class_id')}"


def test_armor_set_id_assigned_by_default_mapper():
    """Каждому armor предмету _default_set_id назначил set_id (как helmet/shield/etc)."""
    armor_items = get_items_for_slot("armor")
    for it in armor_items:
        assert it.get("set_id"), f"{it['id']} не имеет set_id"


def test_armor_mythic4_is_legendary_usdt_template():
    """armor_mythic4 = заготовка legendary_usdt: 0 базовых статов, free_stats=19."""
    item = get_item("armor_mythic4")
    assert item is not None
    assert item.get("str_bonus", 0) == 0
    assert item.get("agi_bonus", 0) == 0
    assert item.get("intu_bonus", 0) == 0
    assert item.get("hp_bonus", 0) == 0
    assert item.get("free_stats") == 19
    assert item.get("custom_name_supported") is True
    assert item.get("legacy_class_id") == "legendary_usdt"


def test_armor_stats_match_legacy_class_bundles():
    """Статы armor совпадают со старой class-системой (миграция стат не теряет).

    Унификация armor (этап 7): str_bonus = bundle.bonus_strength,
    agi_bonus = bundle.bonus_agility, intu_bonus = bundle.bonus_intuition,
    hp_bonus = bundle.bonus_endurance × 2 (STAMINA_PER_FREE_STAT).
    """
    from config.class_bundles import DIAMONDS_CLASSES, GOLD_CLASSES, MYTHIC_CLASSES

    legacy_to_new = {
        "tank_free": "armor_free1", "agile_free": "armor_free2",
        "crit_free": "armor_free3", "universal_free": "armor_free4",
        "berserker_gold": "armor_gold1", "assassin_gold": "armor_gold2",
        "mage_gold": "armor_gold3", "paladin_gold": "armor_gold4",
        "dragonknight_diamonds": "armor_dia1", "shadowdancer_diamonds": "armor_dia2",
        "archmage_diamonds": "armor_dia3", "universal_diamonds": "armor_dia4",
        "berserker_mythic": "armor_mythic1", "assassin_mythic": "armor_mythic2",
        "archmage_mythic": "armor_mythic3",
    }
    all_bundles = {**GOLD_CLASSES, **DIAMONDS_CLASSES, **MYTHIC_CLASSES}
    for legacy_id, new_id in legacy_to_new.items():
        bundle = all_bundles[legacy_id]
        item = get_item(new_id)
        assert item.get("str_bonus", 0) == bundle["bonus_strength"], f"{new_id} str_bonus"
        assert item.get("agi_bonus", 0) == bundle["bonus_agility"], f"{new_id} agi_bonus"
        assert item.get("intu_bonus", 0) == bundle["bonus_intuition"], f"{new_id} intu_bonus"
        assert item.get("hp_bonus", 0) == bundle["bonus_endurance"] * 2, f"{new_id} hp_bonus"


def test_armor_stats_in_get_item_stats():
    """Статы armor читаются через get_item_stats как у обычных предметов.

    Унификация armor (этап 7): str_bonus/agi_bonus/intu_bonus/hp_bonus
    теперь стандартные поля → get_item_stats их возвращает → в бою
    применяются автоматически через battle_system.
    """
    from db_schema.equipment_catalog import get_item_stats

    stats = get_item_stats("armor_gold1")  # berserker_gold: str=7, end=7
    assert stats["str_bonus"] == 7
    assert stats["hp_bonus"] == 14  # 7 × STAMINA_PER_FREE_STAT(2)
    assert stats["agi_bonus"] == 0
    assert stats["intu_bonus"] == 0


# ── Коммит 2: таблицы armor_custom_mods / player_owned_armor + миграция ─────

def test_armor_tables_created(db):
    """Миграции part10 создали новые таблицы — INSERT/SELECT работают."""
    db.get_or_create_player(11001, "u_armor_tables")

    # Проверяем INSERT в player_owned_armor через mixin
    db.add_owned_armor(11001, "armor_gold1")
    assert db.is_armor_owned(11001, "armor_gold1") is True
    assert "armor_gold1" in db.get_owned_armor(11001)

    # Идемпотентность (на conflict)
    db.add_owned_armor(11001, "armor_gold1")
    assert db.get_owned_armor(11001) == ["armor_gold1"]


def test_armor_custom_mods_crud(db):
    """armor_custom_mods: upsert/get/reset работают."""
    db.get_or_create_player(11002, "u_armor_mods")

    # get на пустом → None
    assert db.get_armor_custom_mods(11002, "armor_mythic4") is None

    # upsert + get
    db.upsert_armor_custom_mods(
        11002, "armor_mythic4",
        str_bonus=7, agi_bonus=4, int_bonus=3, end_bonus=5,
        custom_name="Светобой",
        applied=True,
    )
    mods = db.get_armor_custom_mods(11002, "armor_mythic4")
    assert mods is not None
    assert mods["str_bonus"] == 7
    assert mods["agi_bonus"] == 4
    assert mods["int_bonus"] == 3
    assert mods["end_bonus"] == 5
    assert mods["custom_name"] == "Светобой"
    assert mods["applied"] is True

    # Сумма распределения = 19 (контракт legendary_usdt)
    assert mods["str_bonus"] + mods["agi_bonus"] + mods["int_bonus"] + mods["end_bonus"] == 19

    # reset
    db.reset_armor_custom_mods(11002, "armor_mythic4")
    mods = db.get_armor_custom_mods(11002, "armor_mythic4")
    assert mods["str_bonus"] == 0
    assert mods["custom_name"] is None
    assert mods["applied"] is False


def test_migration_owned_armor_from_user_inventory(db):
    """После создания user_inventory.purchase → миграция переносит в player_owned_armor.

    Здесь делаем ручной INSERT в user_inventory (как старая система покупала),
    затем перепрогоняем миграции (через _ensure_inventory_schema) и проверяем
    что данные оказались в player_owned_armor с новым item_id.

    Примечание: миграции уже применены при init_database; для проверки
    переноса дописываем строки и заново триггерим миграции 003/004 — они
    INSERT OR IGNORE, идемпотентны.
    """
    db.get_or_create_player(11003, "u_migrate")

    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO user_inventory (user_id, class_id, class_type, custom_name,
           strength_saved, agility_saved, intuition_saved, endurance_saved, stats_applied)
           VALUES (?, 'berserker_gold', 'gold', NULL, 0, 0, 0, 0, 0)""",
        (11003,),
    )
    cur.execute(
        """INSERT INTO user_inventory (user_id, class_id, class_type, custom_name,
           strength_saved, agility_saved, intuition_saved, endurance_saved, stats_applied)
           VALUES (?, 'legendary_usdt', 'usdt', 'Светобой', 7, 4, 3, 5, 1)""",
        (11003,),
    )
    conn.commit()

    # Применить миграцию 003 и 004 повторно (INSERT OR IGNORE — идемпотентны)
    from db_schema.sqlite_migrations_part10_armor_unify import MIGRATIONS_PART10_ARMOR_UNIFY
    for mig_id, stmts in MIGRATIONS_PART10_ARMOR_UNIFY:
        if mig_id in ("2026_05_18_003_migrate_owned_armor_from_user_inventory",
                      "2026_05_18_004_migrate_usdt_custom_mods"):
            for s in stmts:
                cur.execute(s)
    conn.commit()
    conn.close()

    owned = db.get_owned_armor(11003)
    assert "armor_gold1" in owned, f"berserker_gold должен мигрировать в armor_gold1, owned={owned}"
    assert "armor_mythic4" in owned, f"legendary_usdt должен мигрировать в armor_mythic4, owned={owned}"

    mods = db.get_armor_custom_mods(11003, "armor_mythic4")
    assert mods is not None, "USDT-кастомка должна попасть в armor_custom_mods"
    assert mods["str_bonus"] == 7
    assert mods["agi_bonus"] == 4
    assert mods["int_bonus"] == 3
    assert mods["end_bonus"] == 5
    assert mods["custom_name"] == "Светобой"
    assert mods["applied"] is True


# ── Коммит 3: switch_class dual-write + get_equipment fallback ──────────────

def _purchase_class_directly(db, user_id: int, class_id: str, class_type: str) -> None:
    """Имитация покупки класса (запись в user_inventory) до перевода на equip_item."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO user_inventory (user_id, class_id, class_type) VALUES (?, ?, ?)",
        (user_id, class_id, class_type),
    )
    conn.commit()
    conn.close()


def test_switch_class_writes_to_player_equipment_armor(db):
    """После switch_class('berserker_gold') в player_equipment появляется armor_gold1."""
    db.get_or_create_player(12001, "u_sc_eq")
    _purchase_class_directly(db, 12001, "berserker_gold", "gold")

    ok, _msg = db.switch_class(12001, "berserker_gold")
    assert ok is True

    # В player_equipment должна появиться запись slot='armor', item_id='armor_gold1'
    conn = db.get_connection()
    row = conn.execute(
        "SELECT item_id FROM player_equipment WHERE user_id = ? AND slot = 'armor'",
        (12001,),
    ).fetchone()
    conn.close()
    assert row is not None, "switch_class должен записать armor в player_equipment"
    assert row["item_id"] == "armor_gold1"

    # А также добавить в player_owned_armor
    assert "armor_gold1" in db.get_owned_armor(12001)


def test_switch_class_updates_player_equipment_on_change(db):
    """switch_class на другой class_id обновляет player_equipment.armor."""
    db.get_or_create_player(12002, "u_sc_change")
    _purchase_class_directly(db, 12002, "berserker_gold", "gold")
    _purchase_class_directly(db, 12002, "paladin_gold", "gold")

    db.switch_class(12002, "berserker_gold")
    db.switch_class(12002, "paladin_gold")

    conn = db.get_connection()
    row = conn.execute(
        "SELECT item_id FROM player_equipment WHERE user_id = ? AND slot = 'armor'",
        (12002,),
    ).fetchone()
    conn.close()
    assert row["item_id"] == "armor_gold4"  # paladin_gold → armor_gold4


def test_unequip_class_clears_player_equipment_armor(db):
    """unequip_class удаляет запись slot='armor' из player_equipment."""
    db.get_or_create_player(12003, "u_unequip")
    _purchase_class_directly(db, 12003, "berserker_gold", "gold")
    db.switch_class(12003, "berserker_gold")

    ok, _msg = db.unequip_class(12003)
    assert ok is True

    conn = db.get_connection()
    row = conn.execute(
        "SELECT item_id FROM player_equipment WHERE user_id = ? AND slot = 'armor'",
        (12003,),
    ).fetchone()
    conn.close()
    assert row is None, "После unequip_class запись armor в player_equipment должна исчезнуть"


def test_get_equipment_returns_armor_via_player_equipment(db):
    """get_equipment видит armor как обычный 6-й слот после switch_class."""
    db.get_or_create_player(12004, "u_get_eq_armor")
    _purchase_class_directly(db, 12004, "tank_free", "gold")
    db.switch_class(12004, "tank_free")

    eq = db.get_equipment(12004)
    assert "armor" in eq, f"armor должен быть в get_equipment, eq={list(eq.keys())}"
    assert eq["armor"]["item_id"] == "armor_free1"
    assert eq["armor"]["rarity"] == "common"


def test_get_equipment_armor_fallback_from_current_class(db):
    """Если в player_equipment пусто, но players.current_class заполнен — fallback работает.

    Имитирует переходное состояние между deploy'ями (старая запись в БД,
    новая система ещё не записала в player_equipment).
    """
    db.get_or_create_player(12005, "u_fallback")
    # Прямой UPDATE players.current_class без switch_class — fallback должен сработать
    conn = db.get_connection()
    conn.execute(
        "UPDATE players SET current_class = 'berserker_gold', current_class_type = 'gold' WHERE user_id = ?",
        (12005,),
    )
    conn.commit()
    conn.close()

    eq = db.get_equipment(12005)
    assert "armor" in eq, "fallback из current_class должен сработать"
    assert eq["armor"]["item_id"] == "armor_gold1"


def test_get_equipment_armor_mythic_blocks_without_owned(db):
    """Мифик-армор без записи в player_owned_armor и без rental — get_equipment его НЕ возвращает.

    Защита: даже если кто-то залил current_class='berserker_mythic' прямым SQL,
    игрок не должен получать stats от мифика без покупки/аренды.
    """
    db.get_or_create_player(12006, "u_mythic_block")
    conn = db.get_connection()
    conn.execute(
        "UPDATE players SET current_class = 'berserker_mythic', current_class_type = 'mythic' WHERE user_id = ?",
        (12006,),
    )
    conn.commit()
    conn.close()

    eq = db.get_equipment(12006)
    assert "armor" not in eq, "мифик-армор без owned/rental должен быть скрыт"


def test_get_equipment_armor_mythic_works_with_owned(db):
    """Мифик-армор с записью в player_owned_armor — get_equipment возвращает корректно."""
    db.get_or_create_player(12007, "u_mythic_owned")
    db.add_owned_armor(12007, "armor_mythic1")
    conn = db.get_connection()
    conn.execute(
        "UPDATE players SET current_class = 'berserker_mythic', current_class_type = 'mythic' WHERE user_id = ?",
        (12007,),
    )
    conn.commit()
    conn.close()

    eq = db.get_equipment(12007)
    assert "armor" in eq
    assert eq["armor"]["item_id"] == "armor_mythic1"
    assert eq["armor"]["rarity"] == "mythic"


def test_get_equipment_armor_mythic_works_with_rental(db):
    """Мифик-армор без покупки, но с активной арендой — get_equipment возвращает."""
    db.get_or_create_player(12008, "u_mythic_rent")
    db.rent_item(12008, "armor_mythic1", days=7, stars_paid=100)
    conn = db.get_connection()
    conn.execute(
        "UPDATE players SET current_class = 'berserker_mythic', current_class_type = 'mythic' WHERE user_id = ?",
        (12008,),
    )
    conn.commit()
    conn.close()

    eq = db.get_equipment(12008)
    assert "armor" in eq
    assert eq["armor"]["item_id"] == "armor_mythic1"


# ── Коммит 4: set-resolver не делает двойной счёт armor ──────────────────────

def test_set_resolver_no_double_count_armor(db):
    """После унификации armor приходит в equipped, виртуальное добавление убрано.

    Раньше для armor в resolve_active_sets делалось +1 виртуально (из
    current_class). Если бы это осталось — после унификации armor считался
    бы дважды (один раз как item в equipped, второй раз виртуально).
    Этот тест защищает от регрессии.
    """
    from repositories.sets import resolve_active_sets

    db.get_or_create_player(12010, "u_no_double")
    _purchase_class_directly(db, 12010, "berserker_gold", "gold")
    db.switch_class(12010, "berserker_gold")

    eq = db.get_equipment(12010)
    # armor_gold1 принадлежит archetype-сету (см. _SET_RING[4]='mage')
    armor_set_id = eq["armor"].get("set_id")
    assert armor_set_id, "armor должен иметь set_id"

    # Передаём current_class — он должен игнорироваться
    actives = resolve_active_sets(eq, current_class="berserker_gold")

    # Counter для armor-сета должен быть ровно 1 (один armor), не 2
    matching = [s for s in actives if s["set_id"] == armor_set_id]
    if matching:
        assert matching[0]["count"] == 1, (
            f"armor-сет {armor_set_id} должен считаться ровно 1 раз, "
            f"получили {matching[0]['count']} (двойной счёт)"
        )
