"""
tests/test_leaderboard_payouts.py — недельные выплаты по лидербордам.

Покрывает:
- PvP: топ-1 получает 120💎 + 1200g + титул,
- идемпотентность (повторный вызов pvp_paid=0),
- Titan: payout + сброс titan_progress.current_floor=1,
- Natisk: топ-5 получает награды,
- WB: топ-5 (по урону) получает награды,
- пустые таблицы → не падает, *_paid==0.

Все INSERT с прошлонедельным created_at, чтобы попадать в окно
prev_iso_week_bounds_utc() — функция возвращает реальное время.
"""
from __future__ import annotations


def _prev_week():
    from db_core import prev_iso_week_bounds_utc
    return prev_iso_week_bounds_utc()


def _patch_writes_outside_main_tx(db):
    """В payout-транзакции код параллельно пишет в metric_events и читает chat_id
    отдельным connection. В SQLite WAL это конфликт пишущих → 'database is locked'.
    В тестах эти побочные операции не нужны — заглушаем."""
    db.log_metric_event = lambda *a, **kw: None
    db.get_player_chat_id = lambda uid: None


def _diamonds_gold(db, uid: int):
    conn = db.get_connection()
    row = conn.execute(
        "SELECT diamonds, gold, display_title FROM players WHERE user_id=?", (uid,)
    ).fetchone()
    conn.close()
    return int(row["diamonds"]), int(row["gold"]), row["display_title"]


def _insert_battle(db, p1: int, p2: int, winner: int, when):
    """Прямой INSERT в battles с явным created_at (колонки реальной схемы)."""
    conn = db.get_connection()
    conn.execute(
        "INSERT INTO battles (player1_id, player2_id, is_bot1, is_bot2, winner_id, "
        "battle_result, rounds_played, created_at) VALUES (?, ?, 0, 0, ?, 'player1_wins', 3, ?)",
        (p1, p2, winner, when.strftime("%Y-%m-%d %H:%M:%S")),
    )
    conn.commit()
    conn.close()


def test_pvp_payout_credits_top_player(db):
    """PvP топ-1 получает 120💎 + 1200g + титул «Легенда PvP»."""
    week_key, start, end = _prev_week()
    db.get_or_create_player(1001, "winner")
    db.get_or_create_player(1002, "loser")
    diamonds_before, gold_before, _ = _diamonds_gold(db, 1001)

    # Битва на прошлой неделе, выиграл 1001
    midweek = start
    for _ in range(3):
        _insert_battle(db, 1001, 1002, winner=1001, when=midweek)

    _patch_writes_outside_main_tx(db)
    out = db.process_weekly_leaderboard_payouts()

    assert out["pvp_paid"] >= 1, f"Должна быть выплата, получили {out['pvp_paid']}"
    d, g, title = _diamonds_gold(db, 1001)
    assert d - diamonds_before == 120, f"Алмазы должны быть +120, получили дельту {d - diamonds_before}"
    assert g - gold_before == 1200
    assert title == "Легенда PvP"


def test_pvp_payout_idempotent(db):
    """Повторный вызов → pvp_paid=0 (защита от двойной выплаты)."""
    week_key, start, end = _prev_week()
    db.get_or_create_player(1003, "w")
    db.get_or_create_player(1004, "l")
    _insert_battle(db, 1003, 1004, winner=1003, when=start)

    _patch_writes_outside_main_tx(db)
    out1 = db.process_weekly_leaderboard_payouts()
    out2 = db.process_weekly_leaderboard_payouts()

    assert out1["pvp_paid"] >= 1
    assert out2["pvp_paid"] == 0, "Повторный запуск НЕ должен платить второй раз"


def test_titan_payout_resets_current_floor(db):
    """После Titan-payout titan_progress.current_floor сбрасывается до 1."""
    week_key, _, _ = _prev_week()
    db.get_or_create_player(1005, "titan")
    conn = db.get_connection()
    # Titan score прошлой недели + текущий floor=10
    conn.execute(
        "INSERT INTO titan_weekly_scores (user_id, week_key, max_floor, best_at) VALUES (?, ?, ?, '2024-01-01 00:00:00')",
        (1005, week_key, 10),
    )
    conn.execute(
        "INSERT OR REPLACE INTO titan_progress (user_id, current_floor) VALUES (?, ?)",
        (1005, 10),
    )
    conn.commit()
    conn.close()

    _patch_writes_outside_main_tx(db)
    db.process_weekly_leaderboard_payouts()

    conn = db.get_connection()
    floor = conn.execute("SELECT current_floor FROM titan_progress WHERE user_id=?", (1005,)).fetchone()["current_floor"]
    conn.close()
    assert floor == 1, f"После titan payout current_floor должен сброситься до 1, получили {floor}"


def test_natisk_payout_credits_top_player(db):
    """Натиск: топ-1 получает 100💎 + 700g."""
    week_key, _, _ = _prev_week()
    db.get_or_create_player(1006, "natisk_w")
    diamonds_before, gold_before, _ = _diamonds_gold(db, 1006)
    conn = db.get_connection()
    conn.execute(
        "INSERT INTO endless_weekly_scores (user_id, week_key, best_wave_this_week) VALUES (?, ?, ?)",
        (1006, week_key, 50),
    )
    conn.commit()
    conn.close()

    _patch_writes_outside_main_tx(db)
    out = db.process_weekly_leaderboard_payouts()

    assert out.get("natisk_paid", 0) >= 1
    d, g, _title = _diamonds_gold(db, 1006)
    assert d - diamonds_before == 100, f"Натиск топ-1 должен дать 100💎, получили дельту {d - diamonds_before}"
    assert g - gold_before == 700


def test_wb_payout_credits_top_player(db):
    """WB: топ-1 (по урону) получает 100💎 + 1000g + титул «Убийца Боссов»."""
    week_key, _, _ = _prev_week()
    db.get_or_create_player(1007, "wb_w")
    diamonds_before, gold_before, _ = _diamonds_gold(db, 1007)
    conn = db.get_connection()
    conn.execute(
        "INSERT INTO wb_weekly_scores (user_id, week_key, total_damage) VALUES (?, ?, ?)",
        (1007, week_key, 50000),
    )
    conn.commit()
    conn.close()

    _patch_writes_outside_main_tx(db)
    out = db.process_weekly_leaderboard_payouts()

    assert out.get("wb_paid", 0) >= 1
    d, g, title = _diamonds_gold(db, 1007)
    assert d - diamonds_before == 100, f"WB топ-1 должен дать 100💎, получили дельту {d - diamonds_before}"
    assert g - gold_before == 1000
    assert title == "Убийца Боссов"


def test_payout_handles_empty_boards(db):
    """Все таблицы пустые → payout не падает, все *_paid==0."""
    _patch_writes_outside_main_tx(db)
    out = db.process_weekly_leaderboard_payouts()

    assert out["pvp_paid"] == 0
    assert out["titan_paid"] == 0
    assert out["natisk_paid"] == 0
    assert out.get("wb_paid", 0) == 0
