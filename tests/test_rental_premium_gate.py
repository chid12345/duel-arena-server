"""
tests/test_rental_premium_gate.py — аренда мифик-вещей только для Premium.

Этап 9 аудита (решение игрока): аренда — перк Premium-подписки. Раньше
маршруты /api/rental/* пускали любого игрока. Теперь без активной подписки
инвойс не создаётся.
"""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _make_body(item_id: str):
    class _B:
        pass
    b = _B()
    b.init_data = "x"
    b.item_id = item_id
    return b


def _endpoint(name: str):
    from fastapi import FastAPI
    from api.rental_routes import register_rental_routes
    app = FastAPI()
    register_rental_routes(app)
    for route in app.routes:
        if getattr(route, "name", None) == name:
            return route.endpoint
    raise KeyError(name)


def _setup(monkeypatch, db, uid: int):
    monkeypatch.setattr("api.rental_routes.db", db)
    monkeypatch.setattr("api.rental_routes.get_user_from_init_data", lambda _i: {"id": uid})
    monkeypatch.setattr("api.rental_routes._rl_check", lambda *a, **k: None)
    db.get_or_create_player(uid, f"u{uid}")


def test_rental_stars_blocked_for_non_premium(db, monkeypatch):
    """Без подписки Stars-инвойс аренды не создаётся → premium-reason."""
    _setup(monkeypatch, db, 7001)
    ep = _endpoint("rental_stars_invoice")
    res = asyncio.run(ep(_make_body("sword_mythic")))
    assert res["ok"] is False
    assert "Premium" in res.get("reason", "")


def test_rental_crypto_blocked_for_non_premium(db, monkeypatch):
    """Без подписки USDT-инвойс аренды не создаётся → premium-reason."""
    _setup(monkeypatch, db, 7002)
    ep = _endpoint("rental_crypto_invoice")
    res = asyncio.run(ep(_make_body("sword_mythic")))
    assert res["ok"] is False
    assert "Premium" in res.get("reason", "")


def test_rental_passes_premium_gate(db, monkeypatch):
    """С активной подпиской гейт пройден (дальше упрётся в BOT_TOKEN/сеть,
    но НЕ в premium-reason)."""
    _setup(monkeypatch, db, 7003)
    db.activate_premium(7003, days=21)
    ep = _endpoint("rental_stars_invoice")
    res = asyncio.run(ep(_make_body("sword_mythic")))
    assert "только Premium" not in res.get("reason", ""), \
        f"премиум не должен блокироваться, reason={res.get('reason')}"


def test_rental_non_mythic_rejected(db, monkeypatch):
    """Не-мифик предмет нельзя арендовать (даже с премиумом)."""
    _setup(monkeypatch, db, 7004)
    db.activate_premium(7004, days=21)
    ep = _endpoint("rental_stars_invoice")
    res = asyncio.run(ep(_make_body("sword_free")))
    assert res["ok"] is False
    assert "мифическ" in res.get("reason", "").lower()
