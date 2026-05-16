"""
tests/test_premium.py — Premium-подписка и скидки первой покупки.

Покрывает:
- activate_premium(N) → days_left ≈ N,
- продление: activate + activate складываются,
- get_premium_status для истёкшего премиума → is_active=False,
- diamond_first три слота (100/300/500) независимы.

apply_starter_pack удалён в Этапе 7A редизайна — функции и тесты на него вырезаны.
"""
from __future__ import annotations

from datetime import datetime, timedelta


def test_activate_premium_sets_days_left(db):
    """activate_premium(21) → days_left=20 или 21 (зависит от хвоста секунд)."""
    db.get_or_create_player(1001, "u1")

    res = db.activate_premium(1001, days=21)

    assert res["ok"] is True
    assert res["days_left"] in (20, 21), f"Ожидали ~21 день, получили {res['days_left']}"
    status = db.get_premium_status(1001)
    assert status["is_active"] is True


def test_extend_premium_stacks_from_current(db):
    """activate(7) + activate(7) → days_left ≈ 14 (не 7)."""
    db.get_or_create_player(1002, "u2")
    db.activate_premium(1002, days=7)

    res2 = db.activate_premium(1002, days=7)

    assert res2["days_left"] in (13, 14), f"Продление должно складываться, получили {res2['days_left']}"


def test_get_premium_status_expired(db):
    """premium_until=вчера → is_active=False."""
    db.get_or_create_player(1003, "u3")
    yesterday_iso = (datetime.utcnow() - timedelta(days=1)).isoformat()
    conn = db.get_connection()
    conn.execute("UPDATE players SET premium_until = ? WHERE user_id = ?", (yesterday_iso, 1003))
    conn.commit()
    conn.close()

    status = db.get_premium_status(1003)

    assert status["is_active"] is False
    assert status["days_left"] == 0


def test_bot_daily_limit_premium_plus_10():
    """Этап 7B: премиум-подписчик получает +10 к дневному лимиту бот-побед.

    F2P → 20 побед/день, premium → 30 побед/день.
    """
    from config.progression_fmt import BOT_DAILY_LIMIT
    from economy.premium_bonus import bot_daily_limit_for

    assert bot_daily_limit_for(is_premium=False) == BOT_DAILY_LIMIT
    assert bot_daily_limit_for(is_premium=True) == BOT_DAILY_LIMIT + 10


def test_next_battle_x2_requires_premium(db):
    """Этап 7C: F2P не может активировать «удвоить следующий бой»."""
    db.get_or_create_player(2001, "u1")

    res = db.activate_next_battle_x2(2001)
    assert res["ok"] is False
    assert res["error"] == "not_premium"

    status = db.get_next_battle_x2_status(2001)
    assert status["is_premium"] is False
    assert status["available"] is False


def test_next_battle_x2_activate_and_consume(db):
    """Этап 7C: премиум активирует → флаг стоит → consume сжигает один раз."""
    db.get_or_create_player(2002, "u2")
    db.activate_premium(2002, days=7)

    status_before = db.get_next_battle_x2_status(2002)
    assert status_before["available"] is True
    assert status_before["active"] is False

    res = db.activate_next_battle_x2(2002)
    assert res["ok"] is True

    status_after = db.get_next_battle_x2_status(2002)
    assert status_after["active"] is True
    assert status_after["available"] is False
    assert status_after["used_today"] is True

    # Сжигаем один раз — возвращает True
    assert db.consume_next_battle_x2(2002) is True
    # Второй раз — False (флаг уже снят)
    assert db.consume_next_battle_x2(2002) is False


def test_next_battle_x2_once_per_day(db):
    """Этап 7C: даже если флаг сжёг, второй раз за день — нельзя."""
    db.get_or_create_player(2003, "u3")
    db.activate_premium(2003, days=7)
    db.activate_next_battle_x2(2003)
    db.consume_next_battle_x2(2003)

    res = db.activate_next_battle_x2(2003)
    assert res["ok"] is False
    assert res["error"] == "used_today"


def test_diamond_first_three_separate_slots(db):
    """Слоты diamond_first_100/300/500 независимы.

    После покупки 100-пакета слоты 300 и 500 ещё доступны.
    """
    db.get_or_create_player(1005, "u5")
    available_before = db.get_diamond_first_available(1005)
    assert available_before == [100, 300, 500], "У нового игрока все 3 слота доступны"

    ok = db.mark_diamond_first_purchased(1005, 100)

    assert ok is True
    available_after = db.get_diamond_first_available(1005)
    assert 100 not in available_after, "Слот 100 должен быть закрыт"
    assert 300 in available_after and 500 in available_after, "Слоты 300/500 ещё доступны"
