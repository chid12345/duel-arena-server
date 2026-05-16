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
