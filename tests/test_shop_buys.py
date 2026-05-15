"""
tests/test_shop_buys.py — покупки в магазине (зелья, буст XP, сброс статов).

Покрывает:
- buy_hp_potion: единственное зелье full-HP, цена считается формулой
  potion_price_for_hp(max_hp) — растёт с уровнем игрока (этап 2B редизайна),
- buy_hp_potion блокируется при полном HP,
- buy_hp_potion блокируется при нехватке золота,
- buy_xp_boost (+5 charges за 400g),
- consume_xp_boost_charge,
- buy_stat_reset (списывает алмазы, сбрасывает статы).
"""
from __future__ import annotations

from economy.formulas import potion_price_for_hp


def _set_player(db, uid: int, **fields) -> None:
    """Прямой UPDATE players по полям из kwargs."""
    if not fields:
        return
    sets = ", ".join(f"{k} = ?" for k in fields)
    vals = list(fields.values()) + [uid]
    conn = db.get_connection()
    conn.execute(f"UPDATE players SET {sets} WHERE user_id = ?", vals)
    conn.commit()
    conn.close()


def _row(db, uid: int) -> dict:
    """Прочитать строку игрока (db.get_player() публично не определён)."""
    conn = db.get_connection()
    row = conn.execute("SELECT * FROM players WHERE user_id = ?", (uid,)).fetchone()
    conn.close()
    return dict(row)


def test_buy_hp_potion_full_uses_formula_price(db):
    """Зелье HP: цена считается через potion_price_for_hp(max_hp).
    На 1 ур (max_hp=100) ≈ 15g, восстанавливает до full."""
    db.get_or_create_player(1003, "u3")
    _set_player(db, 1003, gold=300, max_hp=200, current_hp=50)

    expected_cost = potion_price_for_hp("hp_full", 200)
    res = db.buy_hp_potion(1003)

    assert res["ok"] is True
    assert res["cost"] == expected_cost, f"Цена должна быть {expected_cost}g, получили {res['cost']}g"
    p = _row(db, 1003)
    assert p["gold"] == 300 - expected_cost, f"Списано {expected_cost}g золота"
    assert p["current_hp"] == p["max_hp"], "HP должно быть full"


def test_buy_hp_potion_scales_with_max_hp(db):
    """Зелье на 80 ур (max_hp=1000) стоит сильно дороже, чем на 1 ур (max_hp=100)."""
    db.get_or_create_player(1010, "u10")
    _set_player(db, 1010, gold=10000, max_hp=100, current_hp=10)
    res_low = db.buy_hp_potion(1010)
    cost_low = res_low["cost"]

    db.get_or_create_player(1011, "u11")
    _set_player(db, 1011, gold=10000, max_hp=1000, current_hp=10)
    res_high = db.buy_hp_potion(1011)
    cost_high = res_high["cost"]

    assert cost_high > cost_low, f"Зелье на 80 ур ({cost_high}g) должно быть дороже, чем на 1 ур ({cost_low}g)"
    # Линейно: max_hp×10 → цена×10 (±1 на округлениях)
    assert abs(cost_high / cost_low - 10) <= 1.0, (
        f"Масштаб ~10×, получили {cost_high/cost_low:.2f}"
    )


def test_buy_hp_potion_blocks_at_full_hp(db):
    """При полном HP зелье не покупается, золото не тратится."""
    db.get_or_create_player(1002, "u2")
    _set_player(db, 1002, gold=200, max_hp=100, current_hp=100)

    res = db.buy_hp_potion(1002)

    assert res["ok"] is False, "При full HP покупка должна быть отклонена"
    p = _row(db, 1002)
    assert p["gold"] == 200, "Золото не должно тратиться"


def test_buy_hp_potion_blocks_when_no_gold(db):
    """При нехватке золота — покупка отклонена, золото не тратится."""
    db.get_or_create_player(1012, "u12")
    _set_player(db, 1012, gold=5, max_hp=100, current_hp=10)

    res = db.buy_hp_potion(1012)

    assert res["ok"] is False, "Должен вернуть ok=False при нехватке золота"
    p = _row(db, 1012)
    assert p["gold"] == 5, "Золото не должно тратиться"


def test_buy_xp_boost_adds_5_charges(db):
    """XP-буст: -400g, +5 charges."""
    db.get_or_create_player(1004, "u4")
    _set_player(db, 1004, gold=500)

    res = db.buy_xp_boost(1004)

    assert res["ok"] is True
    assert res["charges_added"] == 5
    p = _row(db,1004)
    assert p["gold"] == 100, "500-400=100"
    assert p["xp_boost_charges"] == 5


def test_consume_xp_boost_charge_decrements(db):
    """Заряд XP-буста уменьшается на 1, возвращает True."""
    db.get_or_create_player(1005, "u5")
    _set_player(db, 1005, gold=500)
    db.buy_xp_boost(1005)  # +5 charges

    ok = db.consume_xp_boost_charge(1005)

    assert ok is True
    p = _row(db,1005)
    assert p["xp_boost_charges"] == 4


def test_buy_stat_reset_resets_to_baseline(db):
    """Сброс статов: списывает алмазы, статы возвращаются к стартовым."""
    from config import (
        PLAYER_START_STRENGTH, PLAYER_START_ENDURANCE, PLAYER_START_CRIT,
        RESET_STATS_COST_DIAMONDS,
    )
    db.get_or_create_player(1006, "u6")
    _set_player(db, 1006, diamonds=RESET_STATS_COST_DIAMONDS + 50,
                strength=999, endurance=999, crit=999)

    res = db.buy_stat_reset(1006)

    assert res["ok"] is True
    p = _row(db,1006)
    assert p["diamonds"] == 50, "Алмазы списались"
    assert p["strength"] == PLAYER_START_STRENGTH, "Сила сброшена"
    assert p["endurance"] == PLAYER_START_ENDURANCE
    assert p["crit"] == PLAYER_START_CRIT
