"""
tests/test_level_pricing.py — цена предмета с учётом уровня игрока (этап 3A).

Покрывает:
- shop_price: считает через price_for_item от power_score/rarity/tier
- can_purchase: блокирует по тиру
- visible_in_shop_for_level: фильтрует каталог по уровню
- fill_prices_for_level: подставляет price_calc + locked флаг
"""
from __future__ import annotations

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from economy.level_pricing import (  # noqa: E402
    can_purchase,
    fill_prices_for_level,
    get_item_cost,
    shop_price,
    visible_in_shop_for_level,
)


# ── shop_price ────────────────────────────────────────────────────────────────

def test_shop_price_basic_gold():
    """T1/common с power=10 в золоте = 300 (через price_for_item)."""
    item = {"power_score": 10, "rarity": "common", "tier": "T1"}
    # price_for_item(10, "common", "T1", "gold") = 10 * 1.0 * 1.0 * 0.10 * 300 = 300
    assert shop_price(item) == 300


def test_shop_price_grows_with_tier():
    """Тот же предмет в T2 дороже, чем в T1 (tier_mult ×1.8)."""
    base = {"power_score": 10, "rarity": "common"}
    p_t1 = shop_price({**base, "tier": "T1"})
    p_t2 = shop_price({**base, "tier": "T2"})
    p_t3 = shop_price({**base, "tier": "T3"})
    p_t4 = shop_price({**base, "tier": "T4"})
    assert p_t1 < p_t2 < p_t3 < p_t4


def test_shop_price_grows_with_rarity():
    """Тот же предмет в rare дороже common (×2.5), epic ещё дороже."""
    base = {"power_score": 10, "tier": "T1"}
    p_common = shop_price({**base, "rarity": "common"})
    p_rare = shop_price({**base, "rarity": "rare"})
    p_epic = shop_price({**base, "rarity": "epic"})
    p_legendary = shop_price({**base, "rarity": "legendary"})
    assert p_common < p_rare < p_epic < p_legendary


def test_shop_price_default_currency_gold():
    """Без указания currency — берётся gold."""
    item = {"power_score": 10, "rarity": "common", "tier": "T1"}
    assert shop_price(item) == shop_price(item, currency="gold")


def test_shop_price_diamonds():
    """В алмазах цена другая (price_factor.diamond = 0.333 vs gold 0.10)."""
    item = {"power_score": 10, "rarity": "common", "tier": "T1"}
    assert shop_price(item, "diamond") > 0


def test_shop_price_uses_item_currency_field():
    """Если в item есть currency — оно используется по умолчанию."""
    item = {"power_score": 10, "rarity": "common", "tier": "T1", "currency": "diamond"}
    assert shop_price(item) == shop_price(item, "diamond")


def test_shop_price_raises_on_missing_fields():
    """Без power_score/rarity/tier — KeyError."""
    with pytest.raises(KeyError):
        shop_price({"rarity": "common", "tier": "T1"})  # нет power_score
    with pytest.raises(KeyError):
        shop_price({"power_score": 10, "tier": "T1"})  # нет rarity


# ── can_purchase ─────────────────────────────────────────────────────────────

def test_can_purchase_t1_for_newbie():
    """T1 доступен с 1 уровня."""
    item = {"power_score": 10, "rarity": "common", "tier": "T1"}
    ok, _ = can_purchase(player_level=1, item=item)
    assert ok


def test_can_purchase_t4_blocked_for_low_level():
    """T4 заблокирован на 50-м уровне (открывается с 65-го)."""
    item = {"power_score": 10, "rarity": "common", "tier": "T4"}
    ok, reason = can_purchase(player_level=50, item=item)
    assert ok is False
    assert "T4" in reason


def test_can_purchase_t4_ok_at_max_level():
    item = {"power_score": 10, "rarity": "common", "tier": "T4"}
    ok, _ = can_purchase(player_level=80, item=item)
    assert ok


def test_can_purchase_no_tier_field():
    """Если у предмета нет tier — нельзя купить (защита от мусорных каталогов)."""
    ok, reason = can_purchase(player_level=50, item={"power_score": 10})
    assert ok is False
    assert "tier" in reason.lower()


# ── visible_in_shop_for_level ────────────────────────────────────────────────

def test_visible_filters_by_tier():
    """На 1 уровне видны только T1, на 80 — все 4 тира."""
    catalog = {
        "a_t1": {"power_score": 5, "rarity": "common", "tier": "T1"},
        "b_t2": {"power_score": 5, "rarity": "rare",   "tier": "T2"},
        "c_t3": {"power_score": 5, "rarity": "epic",   "tier": "T3"},
        "d_t4": {"power_score": 5, "rarity": "legendary", "tier": "T4"},
    }
    visible_1 = visible_in_shop_for_level(catalog, 1)
    assert set(visible_1) == {"a_t1"}
    visible_30 = visible_in_shop_for_level(catalog, 30)
    assert set(visible_30) == {"a_t1", "b_t2"}
    visible_80 = visible_in_shop_for_level(catalog, 80)
    assert set(visible_80) == {"a_t1", "b_t2", "c_t3", "d_t4"}


def test_visible_keeps_items_without_tier():
    """Legacy предметы (без tier) показываются всем — не ломаем существующий каталог."""
    catalog = {
        "legacy_sword": {"power_score": 5, "rarity": "common"},  # нет tier
        "new_t4": {"power_score": 5, "rarity": "epic", "tier": "T4"},
    }
    visible_1 = visible_in_shop_for_level(catalog, 1)
    assert "legacy_sword" in visible_1
    assert "new_t4" not in visible_1


# ── fill_prices_for_level ────────────────────────────────────────────────────

def test_fill_prices_adds_calc_and_locked():
    """К каждому предмету добавляются поля price_calc и locked."""
    catalog = {
        "t1_ok": {"power_score": 10, "rarity": "common", "tier": "T1"},
        "t4_lock": {"power_score": 10, "rarity": "common", "tier": "T4"},
    }
    out = fill_prices_for_level(catalog, player_level=20)
    assert out["t1_ok"]["price_calc"] > 0
    assert out["t1_ok"]["locked"] is False
    assert out["t4_lock"]["price_calc"] > 0
    assert out["t4_lock"]["locked"] is True


def test_fill_prices_does_not_mutate_source():
    """Исходный каталог не модифицируется."""
    catalog = {"x": {"power_score": 10, "rarity": "common", "tier": "T1"}}
    _ = fill_prices_for_level(catalog, 50)
    assert "price_calc" not in catalog["x"]
    assert "locked" not in catalog["x"]


# ── get_item_cost (этап 3D — magazin reads via formula) ──────────────────────

def test_get_item_cost_uses_formula_for_new_items():
    """Если есть tier+power_score — считается через формулу, не из legacy price_*."""
    item = {
        "power_score": 27, "rarity": "common", "tier": "T1", "currency": "gold",
        "price_gold": 999,  # legacy fallback — НЕ должен использоваться
    }
    cost, cur = get_item_cost(item)
    assert cur == "gold"
    assert cost == 810  # 27 × 1 × 1 × 30 = 810; не 999


def test_get_item_cost_falls_back_to_legacy_without_tier():
    """Legacy предмет (sword_iron) без tier — берётся price_gold напрямую."""
    item = {"rarity": "common", "price_gold": 500}
    cost, cur = get_item_cost(item)
    assert cur == "gold"
    assert cost == 500


def test_get_item_cost_legacy_diamond_priority():
    """Legacy: если есть price_stars — это star, потом diamond, потом gold."""
    item_star = {"price_stars": 100, "price_diamonds": 50, "price_gold": 800}
    assert get_item_cost(item_star) == (100, "star")
    item_dia = {"price_diamonds": 50, "price_gold": 800}
    assert get_item_cost(item_dia) == (50, "diamond")
    item_gold = {"price_gold": 800}
    assert get_item_cost(item_gold) == (800, "gold")


def test_get_item_cost_real_helmet_free1():
    """Реальный helmet_free1 из каталога: формула даёт ~810g."""
    from db_schema.equipment_catalog import EQUIPMENT_CATALOG
    item = EQUIPMENT_CATALOG["helmet_free1"]
    cost, cur = get_item_cost(item)
    assert cur == "gold"
    assert 750 <= cost <= 850, f"Ожидали ~810g, получили {cost}"


def test_get_item_cost_real_helmet_dia1():
    """Реальный helmet_dia1: формула даёт ~77 алмазов."""
    from db_schema.equipment_catalog import EQUIPMENT_CATALOG
    item = EQUIPMENT_CATALOG["helmet_dia1"]
    cost, cur = get_item_cost(item)
    assert cur == "diamond"
    assert 70 <= cost <= 85, f"Ожидали ~77 алмазов, получили {cost}"


# ── Калибровка реального каталога (этап 3C) ──────────────────────────────────

def test_real_catalog_prices_match_formula_within_5pct():
    """Все шмот-предметы из db_schema/equipment_catalog должны иметь
    formula-цену в пределах ±5% от захардкоженной (price_gold/price_diamonds/
    price_stars). Это гарантирует, что переключение магазина на формулу в
    куске 3D не сломает баланс.
    """
    from db_schema.equipment_catalog import EQUIPMENT_CATALOG

    fails = []
    for iid, item in EQUIPMENT_CATALOG.items():
        if "tier" not in item:
            continue  # legacy (sword_iron/steel/chaos) — без tier, пропускаем
        if "price_gold" in item:
            old = item["price_gold"]; cur = "gold"
        elif "price_diamonds" in item:
            old = item["price_diamonds"]; cur = "diamond"
        elif "price_stars" in item:
            old = item["price_stars"]; cur = "star"
        else:
            continue
        new = shop_price(item, cur)
        if old == 0:
            continue
        delta_pct = abs(new - old) / old * 100
        if delta_pct > 5.0:
            fails.append(f"{iid}: old={old}, formula={new}, delta={delta_pct:.1f}%")
    assert not fails, "Калибровка power_score нарушена:\n" + "\n".join(fails)
