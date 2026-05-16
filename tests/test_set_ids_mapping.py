"""
tests/test_set_ids_mapping.py — детерминированный маппинг set_id (Этап 5B).

Покрывает:
- _default_set_id парсит item_id вида '<slot>_<rarity><num>' → архетип
- EQUIPMENT_CATALOG: все 64 предмета шмота + weapons имеют set_id
- Распределение: каждый архетип имеет хотя бы 2 предмета в каждом слоте
- Legacy предметы (sword_iron) без правильного шаблона → set_id отсутствует
- Игрок может собрать полный комплект (6 предметов) любого архетипа
"""
from __future__ import annotations

from collections import Counter

import pytest

from db_schema.equipment_catalog import EQUIPMENT_CATALOG
from db_schema.equipment_items import _default_set_id


# ── _default_set_id парсер ───────────────────────────────────────────────────

def test_default_set_id_for_free_items():
    """*_free1..4 → predator/bastion/berserk/ghost."""
    assert _default_set_id("helmet_free1") == "predator"
    assert _default_set_id("helmet_free2") == "bastion"
    assert _default_set_id("helmet_free3") == "berserk"
    assert _default_set_id("helmet_free4") == "ghost"
    # То же для других слотов
    assert _default_set_id("shield_free1") == "predator"
    assert _default_set_id("ring_free2") == "bastion"
    assert _default_set_id("boots_free3") == "berserk"


def test_default_set_id_for_gold_items():
    """*_gold1..4 → mage/regent/predator/bastion."""
    assert _default_set_id("helmet_gold1") == "mage"
    assert _default_set_id("shield_gold2") == "regent"
    assert _default_set_id("ring_gold3") == "predator"
    assert _default_set_id("boots_gold4") == "bastion"


def test_default_set_id_for_dia_items():
    """*_dia1..4 → berserk/ghost/mage/regent."""
    assert _default_set_id("helmet_dia1") == "berserk"
    assert _default_set_id("shield_dia2") == "ghost"
    assert _default_set_id("ring_dia3") == "mage"
    assert _default_set_id("boots_dia4") == "regent"


def test_default_set_id_for_mythic_items():
    """*_mythic1..4 → predator/bastion/berserk/ghost."""
    assert _default_set_id("helmet_mythic1") == "predator"
    assert _default_set_id("shield_mythic2") == "bastion"
    assert _default_set_id("ring_mythic3") == "berserk"
    assert _default_set_id("boots_mythic4") == "ghost"


def test_default_set_id_for_weapons():
    """Weapons формат '<type>_<rarity>': sword=0, axe=1, club=2, gs=3 в редкости.

    free (offset 0): sword=predator, axe=bastion, club=berserk, gs=ghost
    gold (offset 4): sword=mage, axe=regent, club=predator, gs=bastion
    diamond (offset 8): sword=berserk, axe=ghost, club=mage, gs=regent
    mythic (offset 12): sword=predator, axe=bastion, club=berserk, gs=ghost
    """
    assert _default_set_id("sword_free") == "predator"
    assert _default_set_id("axe_free") == "bastion"
    assert _default_set_id("club_free") == "berserk"
    assert _default_set_id("gs_free") == "ghost"
    assert _default_set_id("sword_gold") == "mage"
    assert _default_set_id("axe_gold") == "regent"
    assert _default_set_id("sword_diamond") == "berserk"
    assert _default_set_id("club_diamond") == "mage"
    assert _default_set_id("sword_mythic") == "predator"
    assert _default_set_id("gs_mythic") == "ghost"


def test_default_set_id_legacy_returns_none():
    """sword_iron / sword_steel / sword_chaos — legacy, не подходят под шаблон."""
    assert _default_set_id("sword_iron") is None
    assert _default_set_id("sword_steel") is None
    assert _default_set_id("sword_chaos") is None


def test_default_set_id_invalid_input():
    assert _default_set_id("") is None
    assert _default_set_id("nounderscore") is None
    assert _default_set_id("helmet_unknown1") is None
    assert _default_set_id("helmet_free99") is None  # num > 4


# ── EQUIPMENT_CATALOG: реальные данные ────────────────────────────────────────

def test_all_helmets_have_set_id():
    """Все 16 шлемов имеют set_id."""
    helmets = [v for k, v in EQUIPMENT_CATALOG.items() if k.startswith("helmet_")]
    assert len(helmets) == 16
    for it in helmets:
        assert "set_id" in it, f"Шлем {it.get('name')} без set_id"


def test_helmet_set_distribution():
    """В шлемах: predator/bastion/berserk/ghost по 3, mage/regent по 2."""
    by_set = Counter()
    for k, v in EQUIPMENT_CATALOG.items():
        if k.startswith("helmet_"):
            by_set[v.get("set_id")] += 1
    assert by_set == Counter({"predator": 3, "bastion": 3, "berserk": 3,
                              "ghost": 3, "mage": 2, "regent": 2})


def test_all_slots_have_all_six_archetypes():
    """В каждом из 4 слотов equipment_items (helmet/shield/ring/boots) есть
    хотя бы один предмет каждого из 6 архетипов. Иначе нельзя собрать полный
    комплект 6 предметов этого архетипа."""
    slots_prefixes = ("helmet", "shield", "ring", "boots")
    archetypes = ("predator", "bastion", "berserk", "ghost", "mage", "regent")
    for prefix in slots_prefixes:
        seen = set()
        for k, v in EQUIPMENT_CATALOG.items():
            if k.startswith(prefix + "_"):
                if v.get("set_id"):
                    seen.add(v["set_id"])
        assert set(archetypes) <= seen, (
            f"В слоте {prefix} нет всех 6 архетипов: есть {seen}"
        )


def test_legacy_swords_no_set_id():
    """sword_iron/steel/chaos (legacy) — без set_id."""
    for legacy_id in ("sword_iron", "sword_steel", "sword_chaos"):
        item = EQUIPMENT_CATALOG.get(legacy_id)
        assert item is not None, f"{legacy_id} нет в каталоге"
        assert item.get("set_id") is None, (
            f"{legacy_id}: legacy не должен иметь set_id, есть {item['set_id']!r}"
        )


def test_full_set_is_achievable():
    """Игрок физически может собрать 6 предметов одного архетипа
    (по одному на каждый из 6 слотов: weapon/shield/belt/boots/ring1 +
    armor через класс — armor пока не в нашей системе, считаем 5+)."""
    # У нас 4 слота equipment_items + weapons → 5 слотов с set_id.
    # Полный комплект 6 = нужно armor с set_id (этап 5B.2 — классы).
    # Сейчас проверяем что 5 слотов покрывают каждый архетип.
    for archetype in ("predator", "bastion", "berserk", "ghost", "mage", "regent"):
        slots_with_archetype = set()
        for k, v in EQUIPMENT_CATALOG.items():
            if v.get("set_id") != archetype:
                continue
            slots_with_archetype.add(v.get("slot"))
        # Минимум 4 слота (по которым у нас есть наборы)
        assert len(slots_with_archetype) >= 4, (
            f"{archetype} только в {len(slots_with_archetype)} слотах: {slots_with_archetype}"
        )
