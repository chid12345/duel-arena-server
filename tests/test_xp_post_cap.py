"""
tests/test_xp_post_cap.py — конвертация XP→Gold после MAX_LEVEL.

После достижения MAX_LEVEL (80) опыт игрока больше не накапливается —
конвертируется в золото по курсу POST_CAP_XP_TO_GOLD (0.1, см. economy.json).

Покрывает:
- ниже cap: XP копится в players.exp,
- на cap: gz получает золото вместо опыта,
- level не превышает MAX_LEVEL,
- xp_to_gold > 0 при capped игроке.
"""
from __future__ import annotations


def _row(db, uid: int) -> dict:
    conn = db.get_connection()
    row = conn.execute("SELECT * FROM players WHERE user_id = ?", (uid,)).fetchone()
    conn.close()
    return dict(row)


def _set_level_and_exp(db, uid: int, level: int, exp: int = 0):
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = ?, exp = ? WHERE user_id = ?",
                 (level, exp, uid))
    conn.commit()
    conn.close()


def test_xp_accumulates_below_cap(db):
    """Низкий уровень: +50 XP → exp растёт, ничего не конвертируется в gold."""
    db.get_or_create_player(1001, "u1")
    _set_level_and_exp(db, 1001, level=5, exp=10)
    p_before = _row(db, 1001)
    gold_before = int(p_before["gold"])

    res = db.grant_exp_with_levelup(1001, exp_add=50)

    assert res["ok"] is True
    assert res["xp_to_gold"] == 0, "Ниже MAX_LEVEL XP→Gold не должно срабатывать"
    p_after = _row(db, 1001)
    # exp вырос (или конвертировался в level — оба варианта, но gold не меняется от XP)
    assert p_after["gold"] == gold_before, f"Gold не должно расти от обычного XP, было {gold_before}, стало {p_after['gold']}"


def test_post_cap_xp_converts_to_gold(db):
    """На MAX_LEVEL: +1000 XP → exp обнуляется, gold +100 (rate 0.1)."""
    from config import MAX_LEVEL

    db.get_or_create_player(1002, "u2")
    _set_level_and_exp(db, 1002, level=MAX_LEVEL, exp=0)
    p_before = _row(db, 1002)
    gold_before = int(p_before["gold"])

    res = db.grant_exp_with_levelup(1002, exp_add=1000)

    assert res["ok"] is True
    assert res["xp_to_gold"] == 100, f"Ожидали 100 gold от 1000 XP × 0.1, получили {res['xp_to_gold']}"
    p_after = _row(db, 1002)
    assert p_after["gold"] == gold_before + 100
    assert p_after["exp"] == 0, "После конвертации exp должен быть 0"


def test_level_does_not_exceed_max(db):
    """На MAX_LEVEL грант 1M XP не поднимает уровень выше cap."""
    from config import MAX_LEVEL

    db.get_or_create_player(1003, "u3")
    _set_level_and_exp(db, 1003, level=MAX_LEVEL, exp=0)

    res = db.grant_exp_with_levelup(1003, exp_add=1_000_000)

    assert res["new_level"] == MAX_LEVEL, f"Level не должен превышать MAX_LEVEL, получили {res['new_level']}"
    p = _row(db, 1003)
    assert p["level"] == MAX_LEVEL


def test_battle_xp_post_cap_converts_to_gold():
    """Боевой путь (_exp_progression_updates) на MAX_LEVEL: опыт → золото, не копится."""
    from config import MAX_LEVEL
    from battle_system import BattleSystem

    bs = BattleSystem()
    player = {
        "level": MAX_LEVEL, "exp": 0, "exp_milestones": 0, "free_stats": 0,
        "gold": 100, "diamonds": 0, "max_hp": 500, "current_hp": 500,
    }
    patch, leveled = bs._exp_progression_updates(player, 1000)

    assert leveled is False
    assert patch["level"] == MAX_LEVEL
    assert patch["exp"] == 0, "на капе опыт не должен копиться"
    assert patch["gold"] == 100 + int(1000 * 0.1), "опыт на капе должен уйти в золото ×0.1"


def test_partial_post_cap_converts_remainder(db):
    """Игрок на (MAX_LEVEL - 1) с большим грантом: дойдёт до MAX_LEVEL и остаток XP → gold."""
    from config import MAX_LEVEL

    db.get_or_create_player(1004, "u4")
    _set_level_and_exp(db, 1004, level=MAX_LEVEL - 1, exp=0)
    p_before = _row(db, 1004)
    gold_before = int(p_before["gold"])

    # Огромный грант — игрок добьёт уровень и остаток уйдёт в gold
    res = db.grant_exp_with_levelup(1004, exp_add=10_000_000)

    assert res["new_level"] == MAX_LEVEL
    assert res["xp_to_gold"] > 0, "Остаток XP должен конвертироваться в gold"
    p_after = _row(db, 1004)
    assert p_after["gold"] > gold_before, "Gold должно вырасти от конвертации"
    assert p_after["exp"] == 0
