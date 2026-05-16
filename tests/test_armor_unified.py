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
    assert item["class_strength"] == 0
    assert item["class_agility"] == 0
    assert item["class_intuition"] == 0
    assert item["class_endurance"] == 0
    assert item.get("free_stats") == 19
    assert item.get("custom_name_supported") is True
    assert item.get("legacy_class_id") == "legendary_usdt"


def test_armor_class_stats_match_legacy_class_bundles():
    """Базовые статы armor совпадают с class_bundles (миграция стат не теряет)."""
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
        assert item["class_strength"] == bundle["bonus_strength"], f"{new_id} strength"
        assert item["class_agility"] == bundle["bonus_agility"], f"{new_id} agility"
        assert item["class_intuition"] == bundle["bonus_intuition"], f"{new_id} intuition"
        assert item["class_endurance"] == bundle["bonus_endurance"], f"{new_id} endurance"


def test_armor_does_not_pollute_get_equipment_stats():
    """class_strength/agility/intuition/endurance НЕ должны попадать в get_item_stats.

    Эти поля применяются delta-моделью в switch_class (коммит 3), а не через
    суммирование как обычные item-bonuses. Двойного счёта быть не должно.
    """
    from db_schema.equipment_catalog import get_item_stats

    stats = get_item_stats("armor_gold1")  # str=7, end=7, special_bonus
    # get_item_stats возвращает только стандартные поля (atk_bonus, hp_bonus, ...)
    # class_* туда не попадают
    assert "class_strength" not in stats
    assert "class_endurance" not in stats
    # Стандартные item-bonuses не заданы для armor → нули
    assert stats["atk_bonus"] == 0
    assert stats["hp_bonus"] == 0


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
