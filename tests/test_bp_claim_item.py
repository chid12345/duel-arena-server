"""
tests/test_bp_claim_item.py — боевой пропуск: награды-предметы реально доходят.

Этап 8 аудита: клейм уровня пасса с предметом писал в снесённую таблицу
user_inventory(item_name) → INSERT падал «no such table», маршрут отдавал
HTTP 500, игрок не получал НИЧЕГО (даже золото откатывалось). Фикс: предмет
выдаётся через add_to_inventory → player_inventory(item_id).
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _reach_level(db, uid, points=600):
    """Накопить BP-очки чтобы достичь уровня (100 очков/уровень → 600 = ур.6)."""
    db.get_or_create_player(uid, "t")
    db.ensure_bp_season()
    db.add_bp_points(uid, points)


def _inv(db, uid):
    return {r["item_id"]: r["quantity"] for r in db.get_inventory(uid)}


def test_bp_item_reward_delivered_to_real_inventory(db):
    """L5 free даёт предмет box_common — должен попасть в player_inventory."""
    _reach_level(db, 5001)
    before = _inv(db, 5001).get("box_common", 0)
    res = db.claim_bp_reward(5001, 5, "free")
    assert res["ok"] is True, res
    assert res["reward"].get("item") == "box_common"
    after = _inv(db, 5001).get("box_common", 0)
    assert after == before + 1, f"box_common не доставлен: было {before}, стало {after}"


def test_bp_item_claim_no_crash_and_double_claim_blocked(db):
    """Клейм предмет-уровня НЕ падает, повторный клейм — already_claimed."""
    _reach_level(db, 5002)
    first = db.claim_bp_reward(5002, 2, "free")  # scroll_str_3
    assert first["ok"] is True, first
    second = db.claim_bp_reward(5002, 2, "free")
    assert second["ok"] is False
    assert second["reason"] == "already_claimed"


def test_bp_gold_level_still_works(db):
    """Уровень только с золотом (L3 free = 250g) по-прежнему начисляет золото."""
    _reach_level(db, 5003)
    conn = db.get_connection(); cur = conn.cursor()
    cur.execute("SELECT gold FROM players WHERE user_id=?", (5003,))
    g0 = int(cur.fetchone()[0]); conn.close()
    res = db.claim_bp_reward(5003, 3, "free")
    assert res["ok"] is True
    conn = db.get_connection(); cur = conn.cursor()
    cur.execute("SELECT gold FROM players WHERE user_id=?", (5003,))
    g1 = int(cur.fetchone()[0]); conn.close()
    assert g1 == g0 + 250, f"золото L3: было {g0}, стало {g1}"


def test_bp_premium_item_requires_premium(db):
    """Premium-трек предмет-уровня без премиума → premium_required (не краш)."""
    _reach_level(db, 5004)
    res = db.claim_bp_reward(5004, 5, "premium")  # box_rare premium
    assert res["ok"] is False
    assert res["reason"] == "premium_required"


def test_subscription_unlocks_bp_premium_track(db):
    """Этап 9 (решение А — единый Premium): activate_premium ТАКЖЕ открывает
    premium-трек пасса → premium-награды становятся доступны. Раньше трек был
    невозможен (activate_bp_premium нигде не вызывался)."""
    uid = 5005
    _reach_level(db, uid)
    # До подписки — premium-трек закрыт
    assert db.claim_bp_reward(uid, 5, "premium")["reason"] == "premium_required"
    # Покупка Premium-подписки должна открыть трек
    db.activate_premium(uid, days=21)
    res = db.claim_bp_reward(uid, 5, "premium")  # box_rare premium
    assert res["ok"] is True, res
    assert res["reward"].get("item") == "box_rare"
    # И предмет реально доставлен в player_inventory
    assert _inv(db, uid).get("box_rare", 0) >= 1
