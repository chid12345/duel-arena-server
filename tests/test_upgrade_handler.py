"""
tests/test_upgrade_handler.py — apply / dismantle / status (этап 4D).

Тестируется через прямой вызов handler-функций. FastAPI TestClient
не нужен — endpoint-функции внутри register_upgrade_routes принимают
body-объект и работают с глобальным db.

Поскольку endpoint использует module-level db, перед тестом подменяем
api.upgrade_handler.db на test-fixture db.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest


def _make_body(init_data: str, item_id: str):
    """Эмулируем pydantic body."""
    class _B:
        pass
    b = _B()
    b.init_data = init_data
    b.item_id = item_id
    return b


def _setup(monkeypatch, db, uid: int, level: int = 80, gold: int = 100_000):
    """Подменяем глобальный db в upgrade_handler + tma_auth.get_user_from_init_data."""
    monkeypatch.setattr("api.upgrade_handler.db", db)
    monkeypatch.setattr("api.upgrade_handler.get_user_from_init_data",
                        lambda _init: {"id": uid})
    monkeypatch.setattr("api.upgrade_handler._rl_check",
                        lambda *a, **k: None)
    monkeypatch.setattr("api.upgrade_handler._cache_invalidate",
                        lambda *a, **k: None)

    db.get_or_create_player(uid, f"u{uid}")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = ?, gold = ? WHERE user_id = ?",
                 (level, gold, uid))
    conn.commit()
    conn.close()


def _get_endpoint(name: str):
    """Достаём endpoint-функцию по имени через временный FastAPI."""
    from fastapi import FastAPI
    from api.upgrade_handler import register_upgrade_routes
    app = FastAPI()
    register_upgrade_routes(app)
    for route in app.routes:
        if getattr(route, "name", None) == name:
            return route.endpoint
    raise KeyError(name)


# ── apply ─────────────────────────────────────────────────────────────────────

def test_upgrade_apply_success_increments_plus(db, monkeypatch):
    """Успешная попытка на +1 (100% шанс): plus = 1, золото и шарды списаны."""
    _setup(monkeypatch, db, uid=5001, level=80, gold=10000)
    db.add_shards(5001, "T1", 5)

    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_free1"))

    assert res["ok"] is True
    assert res["success"] is True, f"+1 = 100% шанс, должен быть успех (был seed=42)"
    assert res["new_plus"] == 1
    assert res["chance_was"] == 1.0
    assert db.get_item_plus(5001, "helmet_free1") == 1


def test_upgrade_apply_blocks_at_max_plus(db, monkeypatch):
    """T1 max+5 — попытка +6 заблокирована."""
    _setup(monkeypatch, db, uid=5002, level=80, gold=100000)
    db.add_shards(5002, "T1", 100)
    # Прокачиваем до +5
    for _ in range(5):
        db.record_upgrade_attempt(5002, "helmet_free1", 0, 0, success=True)

    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_free1"))

    assert res["ok"] is False
    assert "максимум" in res["reason"].lower()


def test_upgrade_apply_insufficient_shards(db, monkeypatch):
    """Нет шардов → отказ, золото не списано."""
    _setup(monkeypatch, db, uid=5003, level=80, gold=10000)
    # Не добавляем шарды

    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_free1"))

    assert res["ok"] is False
    assert "шардов" in res["reason"].lower()
    # Золото не должно быть списано
    conn = db.get_connection()
    row = conn.execute("SELECT gold FROM players WHERE user_id = 5003").fetchone()
    conn.close()
    assert row["gold"] == 10000


def test_upgrade_apply_insufficient_gold_refunds_shards(db, monkeypatch):
    """Не хватило золота → шарды возвращаются (рефанд)."""
    _setup(monkeypatch, db, uid=5004, level=80, gold=10)  # очень мало
    db.add_shards(5004, "T1", 5)

    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "helmet_free1"))

    assert res["ok"] is False
    # Шарды должны остаться (рефанд)
    assert db.get_shards(5004, "T1") == 5


def test_upgrade_apply_unknown_item(db, monkeypatch):
    _setup(monkeypatch, db, uid=5005)
    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "nonexistent_item"))
    assert res["ok"] is False


def test_upgrade_apply_legacy_item_blocked(db, monkeypatch):
    """sword_iron без tier → нельзя апгрейдить."""
    _setup(monkeypatch, db, uid=5006)
    fn = _get_endpoint("upgrade_apply")
    res = fn(_make_body("ok", "sword_iron"))
    assert res["ok"] is False
    assert "legacy" in res["reason"].lower() or "tier" in res["reason"].lower()


# ── dismantle ─────────────────────────────────────────────────────────────────

def test_dismantle_gives_shards_and_resets_plus(db, monkeypatch):
    """Разборка T2: +3 шарда T2, plus сброшен в 0."""
    _setup(monkeypatch, db, uid=5010)
    # Игрок имеет helmet_gold1 (T2) +3
    db.equip_item(5010, "belt", "helmet_gold1", force=True)
    for _ in range(3):
        db.record_upgrade_attempt(5010, "helmet_gold1", 0, 0, success=True)

    fn = _get_endpoint("upgrade_dismantle")
    res = fn(_make_body("ok", "helmet_gold1"))

    assert res["ok"] is True
    assert res["shards_gained"] == 3, f"T2 разборка → 3 шарда"
    assert res["tier"] == "T2"
    assert db.get_shards(5010, "T2") == 3
    assert db.get_item_plus(5010, "helmet_gold1") == 0
    # Снят со слота
    assert "belt" not in db.get_equipment(5010)


def test_dismantle_t4_gives_12_shards(db, monkeypatch):
    """T4 разборка → 12 шардов."""
    _setup(monkeypatch, db, uid=5011)
    fn = _get_endpoint("upgrade_dismantle")
    res = fn(_make_body("ok", "helmet_mythic1"))
    assert res["ok"] is True
    assert res["shards_gained"] == 12
    assert res["tier"] == "T4"


def test_dismantle_consumes_owned_weapon(db, monkeypatch):
    """Разобранный предмет ИСЧЕЗАЕТ из коллекции (player_owned_weapons) и снимается."""
    _setup(monkeypatch, db, uid=5012)
    db.add_owned_weapon(5012, "helmet_gold1")
    db.equip_item(5012, "belt", "helmet_gold1", force=True)

    fn = _get_endpoint("upgrade_dismantle")
    res = fn(_make_body("ok", "helmet_gold1"))

    assert res["ok"] is True
    assert "helmet_gold1" not in db.get_owned_weapons(5012)
    assert "belt" not in db.get_equipment(5012)
    assert "owned_weapons" in res and "helmet_gold1" not in res["owned_weapons"]


def test_dismantle_consumes_owned_armor2(db, monkeypatch):
    """Разобранная броня исчезает из player_owned_armor2."""
    _setup(monkeypatch, db, uid=5013)
    db.add_owned_armor2(5013, "armor2_mythic1")
    db.equip_item(5013, "armor2", "armor2_mythic1", force=True)

    fn = _get_endpoint("upgrade_dismantle")
    res = fn(_make_body("ok", "armor2_mythic1"))

    assert res["ok"] is True
    assert "armor2_mythic1" not in db.get_owned_armor2(5013)
    assert "armor2" not in db.get_equipment(5013)


def test_dismantle_legendary_clears_custom_mods(db, monkeypatch):
    """Разбор легендарной armor2_mythic4 стирает и персональные моды (+19 статов)."""
    _setup(monkeypatch, db, uid=5014)
    db.create_legendary_armor2(5014, "Имя")
    assert db.get_armor2_custom_mods(5014, "armor2_mythic4") is not None

    fn = _get_endpoint("upgrade_dismantle")
    res = fn(_make_body("ok", "armor2_mythic4"))

    assert res["ok"] is True
    assert "armor2_mythic4" not in db.get_owned_armor2(5014)
    assert db.get_armor2_custom_mods(5014, "armor2_mythic4") is None


# ── status ────────────────────────────────────────────────────────────────────

def test_status_returns_plus_and_shards(db, monkeypatch):
    _setup(monkeypatch, db, uid=5020)
    db.add_shards(5020, "T1", 5)
    db.add_shards(5020, "T3", 8)
    db.record_upgrade_attempt(5020, "helmet_free1", 0, 0, success=True)

    fn = _get_endpoint("upgrade_status")
    res = fn("ok_init_data")

    assert res["ok"] is True
    assert res["plus"] == {"helmet_free1": 1}
    assert res["shards"] == {"T1": 5, "T3": 8}
