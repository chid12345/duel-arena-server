"""
tests/test_weapon_tier_pricing.py — оружие в общей системе «балл силы + тир».

Этап 6 аудита (2026_05_22): оружие приведено к tier/power_score как остальные
5 слотов. Эти тесты охраняют от регресса обратно в «оружие без tier», из-за
которого: (1) карточка показывала формульную цену, а списывался старый номинал;
(2) серверная блокировка покупки по уровню (`if item_tier`) не срабатывала.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db_schema.weapon_catalog import WEAPON_CATALOG  # noqa: E402
from economy.level_pricing import can_purchase, get_item_cost  # noqa: E402

_TIER_BY_RARITY = {"common": "T1", "rare": "T2", "epic": "T3", "mythic": "T4"}
_PS_BY_TIER = {"T1": 27, "T2": 59, "T3": 3.0, "T4": 3.58}
_LVL_BY_TIER = {"T1": 1, "T2": 20, "T3": 45, "T4": 65}


def test_every_weapon_has_tier_and_power_score():
    """Регресс-страж: у КАЖДОГО оружия есть tier+power_score+recommended_level.
    Без этого ломается формульная цена и серверная блокировка по уровню."""
    for wid, w in WEAPON_CATALOG.items():
        assert "tier" in w, f"{wid}: нет tier"
        assert "power_score" in w, f"{wid}: нет power_score"
        assert "recommended_level" in w, f"{wid}: нет recommended_level"
        # тир/балл/уровень соответствуют редкости
        assert w["tier"] == _TIER_BY_RARITY[w["rarity"]], f"{wid}: tier не по редкости"
        assert w["power_score"] == _PS_BY_TIER[w["tier"]], f"{wid}: power_score не по тиру"
        assert w["recommended_level"] == _LVL_BY_TIER[w["tier"]], f"{wid}: уровень не по тиру"


def test_gold_weapon_price_is_formula_not_legacy():
    """Золотое оружие T1/T2 теперь считается формулой (810/7965), а не
    старым номиналом 800/8000 — совпадает с карточкой в мини-аппе."""
    cost1, cur1 = get_item_cost(WEAPON_CATALOG["sword_free"])
    assert (cost1, cur1) == (810, "gold")
    cost2, cur2 = get_item_cost(WEAPON_CATALOG["sword_gold"])
    assert (cost2, cur2) == (7965, "gold")


def test_diamond_weapon_price_is_formula():
    """Алмазное оружие T3 = 77 (формула), не 75 (номинал)."""
    cost, cur = get_item_cost(WEAPON_CATALOG["sword_diamond"])
    assert (cost, cur) == (77, "diamond")


def test_mythic_weapon_keeps_stars_price():
    """Мифик-оружие платится за Stars (price_stars=800) — звёздная цена
    не изменилась (списывается через weapon_payment_routes, не формулой)."""
    assert WEAPON_CATALOG["sword_mythic"]["price_stars"] == 800
    assert WEAPON_CATALOG["sword_mythic"]["currency"] == "star"


def test_weapon_tier_lock_blocks_low_level():
    """Серверная блокировка теперь работает: мифик-меч (T4) нельзя на 60 ур.,
    можно на 65; стартовый меч (T1) — с 1 уровня."""
    ok_low, reason = can_purchase(player_level=60, item=WEAPON_CATALOG["sword_mythic"])
    assert ok_low is False
    assert "T4" in reason
    ok_max, _ = can_purchase(player_level=65, item=WEAPON_CATALOG["sword_mythic"])
    assert ok_max is True
    ok_t1, _ = can_purchase(player_level=1, item=WEAPON_CATALOG["sword_free"])
    assert ok_t1 is True
