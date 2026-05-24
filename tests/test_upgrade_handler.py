"""
tests/test_upgrade_handler.py — apply / preview / status (система v2, без шардов).

Через прямой вызов endpoint-функций. Подменяем module-level db и auth.
"""
from __future__ import annotations


def _make_body(init_data: str, item_id: str):
    class _B:
        pass
    b = _B()
    b.init_data = init_data
    b.item_id = item_id
    return b


def _make_batch_body(init_data: str, item_id: str, count: int):
    b = _make_body(init_data, item_id)
    b.count = count
    return b


def _setup(monkeypatch, db, uid: int, level: int = 80, gold: int = 100_000, diamonds: int = 1_000):
    monkeypatch.setattr("api.upgrade_handler.db", db)
    monkeypatch.setattr("api.upgrade_handler.get_user_from_init_data", lambda _i: {"id": uid})
    monkeypatch.setattr("api.upgrade_handler._rl_check", lambda *a, **k: None)
    monkeypatch.setattr("api.upgrade_handler._cache_invalidate", lambda *a, **k: None)
    db.get_or_create_player(uid, f"u{uid}")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = ?, gold = ?, diamonds = ? WHERE user_id = ?",
                 (level, gold, diamonds, uid))
    conn.commit()
    conn.close()


def _get_endpoint(name: str):
    from fastapi import FastAPI
    from api.upgrade_handler import register_upgrade_routes
    app = FastAPI()
    register_upgrade_routes(app)
    for route in app.routes:
        if getattr(route, "name", None) == name:
            return route.endpoint
    raise KeyError(name)


def _player_gold(db, uid):
    conn = db.get_connection()
    row = conn.execute("SELECT gold, diamonds FROM players WHERE user_id = ?", (uid,)).fetchone()
    conn.close()
    return int(row["gold"]), int(row["diamonds"])


# ── apply ─────────────────────────────────────────────────────────────────────

def test_apply_success_charges_gold(db, monkeypatch):
    """T1 +1: plus=1, списано 81 золота."""
    _setup(monkeypatch, db, uid=5001, gold=10_000)
    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_free1"))
    assert res["ok"] is True
    assert res["new_plus"] == 1
    assert res["currency"] == "gold"
    assert res["spent"] == 81
    gold, _ = _player_gold(db, 5001)
    assert gold == 10_000 - 81


def test_apply_blocked_by_player_level(db, monkeypatch):
    """Уровень 2 — после +2 третий апгрейд запрещён."""
    _setup(monkeypatch, db, uid=5002, level=2)
    fn = _get_endpoint("upgrade_apply")
    assert fn(_make_body("ok", "helmet_free1"))["new_plus"] == 1
    assert fn(_make_body("ok", "helmet_free1"))["new_plus"] == 2
    res = fn(_make_body("ok", "helmet_free1"))
    assert res["ok"] is False
    assert "уровень" in res["reason"].lower()


def test_apply_insufficient_gold(db, monkeypatch):
    """Не хватает золота → отказ, баланс не тронут."""
    _setup(monkeypatch, db, uid=5003, gold=10)
    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_free1"))
    assert res["ok"] is False
    gold, _ = _player_gold(db, 5003)
    assert gold == 10


def test_apply_diamond_payment(db, monkeypatch):
    """T4 +21 платится алмазами (14💠)."""
    _setup(monkeypatch, db, uid=5004, diamonds=1_000)
    for _ in range(20):
        db.record_upgrade(5004, "helmet_mythic1")  # докрутили до +20
    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_mythic1"))
    assert res["ok"] is True
    assert res["new_plus"] == 21
    assert res["currency"] == "diamond"
    assert res["spent"] == 14
    _, diamonds = _player_gold(db, 5004)
    assert diamonds == 1_000 - 14


def test_apply_free_roll_no_charge(db, monkeypatch):
    """С +61 при удачном ролле апгрейд бесплатный (деньги не списаны)."""
    _setup(monkeypatch, db, uid=5005, gold=10_000, diamonds=1_000)
    monkeypatch.setattr("api.upgrade_handler.random.random", lambda: 0.0)  # всегда удача
    for _ in range(60):
        db.record_upgrade(5005, "helmet_mythic1")  # до +60
    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_mythic1"))
    assert res["ok"] is True
    assert res["new_plus"] == 61
    assert res["was_free"] is True
    assert res["spent"] == 0
    assert res["free_remaining"] == 2
    gold, diamonds = _player_gold(db, 5005)
    assert gold == 10_000 and diamonds == 1_000


def test_apply_unknown_item(db, monkeypatch):
    _setup(monkeypatch, db, uid=5006)
    res = _get_endpoint("upgrade_apply")(_make_body("ok", "nonexistent_item"))
    assert res["ok"] is False


def test_apply_legacy_item_blocked(db, monkeypatch):
    """Предмет без tier — нельзя улучшить."""
    _setup(monkeypatch, db, uid=5007)
    res = _get_endpoint("upgrade_apply")(_make_body("ok", "sword_iron"))
    assert res["ok"] is False
    assert "legacy" in res["reason"].lower() or "tier" in res["reason"].lower()


# ── apply_batch ───────────────────────────────────────────────────────────────

def test_apply_batch_ten_levels(db, monkeypatch):
    """count=10 за один запрос: plus=10, золото списано суммой."""
    _setup(monkeypatch, db, uid=6001, gold=100_000)
    res = _get_endpoint("upgrade_apply_batch")(_make_batch_body("ok", "helmet_free1", 10))
    assert res["ok"] is True
    assert res["applied"] == 10
    assert res["new_plus"] == 10
    assert res["gold_spent"] > 0
    gold, _ = _player_gold(db, 6001)
    assert gold == 100_000 - res["gold_spent"]


def test_apply_batch_max_capped_by_level(db, monkeypatch):
    """count<=0 (Макс) ограничен уровнем игрока."""
    _setup(monkeypatch, db, uid=6002, level=5, gold=100_000)
    res = _get_endpoint("upgrade_apply_batch")(_make_batch_body("ok", "helmet_free1", 0))
    assert res["ok"] is True
    assert res["applied"] == 5
    assert res["new_plus"] == 5


def test_apply_batch_partial_when_low_gold(db, monkeypatch):
    """Денег хватает не на все 10 — применяем сколько хватило."""
    _setup(monkeypatch, db, uid=6003, gold=200)
    res = _get_endpoint("upgrade_apply_batch")(_make_batch_body("ok", "helmet_free1", 10))
    assert res["ok"] is True
    assert 0 < res["applied"] < 10


# ── preview / status ──────────────────────────────────────────────────────────

def test_preview_shows_cost_and_currency(db, monkeypatch):
    _setup(monkeypatch, db, uid=5010, gold=5_000)
    res = _get_endpoint("upgrade_preview")("ok", "helmet_free1")
    assert res["ok"] is True
    assert res["current_plus"] == 0
    assert res["target_plus"] == 1
    assert res["cost"] == 81
    assert res["currency"] == "gold"
    assert res["player_gold"] == 5_000


def test_status_returns_plus_only(db, monkeypatch):
    _setup(monkeypatch, db, uid=5020)
    db.record_upgrade(5020, "helmet_free1")
    res = _get_endpoint("upgrade_status")("ok_init")
    assert res["ok"] is True
    assert res["plus"] == {"helmet_free1": 1}
    assert "shards" not in res
