"""
tests/test_avatar_buy_free.py — покупка образов: бесплатные выдаются без оплаты.

Баг: во вкладке «Free» при «Получить бесплатно» сервер отвечал «Этот образ
покупается через Stars/USDT» — buy_avatar пропускал только gold/diamonds, а
'free' (tier=base, price=0) падал в ветку отказа. Фикс: free выдаётся бесплатно.
Заодно проверяем, что золото/алмазы и премиум ведут себя как раньше.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _set(db, uid, **cols):
    conn = db.get_connection()
    cur = conn.cursor()
    sets = ", ".join(f"{k} = ?" for k in cols)
    cur.execute(f"UPDATE players SET {sets} WHERE user_id = ?", (*cols.values(), uid))
    conn.commit()
    conn.close()


def _is_unlocked(db, uid, aid):
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM user_avatar_unlocks WHERE user_id = ? AND avatar_id = ?", (uid, aid))
    row = cur.fetchone()
    conn.close()
    return row is not None


def test_free_avatar_unlocks_without_payment(db):
    db.get_or_create_player(1, "t")
    r = db.buy_avatar(1, "base_tank")
    assert r["ok"] is True, r
    assert r.get("currency") == "free"
    assert _is_unlocked(db, 1, "base_tank"), "free образ должен реально разблокироваться"
    # повторно — идемпотентно, не падает, не дубль
    r2 = db.buy_avatar(1, "base_tank")
    assert r2["ok"] is True


def test_free_avatar_given_even_with_zero_money(db):
    db.get_or_create_player(2, "t")
    _set(db, 2, gold=0, diamonds=0)
    r = db.buy_avatar(2, "base_berserker")  # free → выдаётся даже без денег
    assert r["ok"] is True


def test_gold_avatar_still_requires_gold(db):
    db.get_or_create_player(3, "t")
    _set(db, 3, gold=0)
    r = db.buy_avatar(3, "gold_vanguard")  # 900g, денег нет → отказ про золото
    assert r["ok"] is False
    assert "золота" in r.get("reason", "")


def test_gold_avatar_buys_with_enough_gold(db):
    db.get_or_create_player(4, "t")
    _set(db, 4, gold=5000)
    r = db.buy_avatar(4, "gold_blade")  # 500g
    assert r["ok"] is True
    assert r.get("currency") == "gold"


def test_big_telegram_id_supported(db):
    """user_id > 2^31 (новые Telegram-ID) не должен падать (на PG был INTEGER overflow)."""
    big = 8123456789  # > 2_147_483_647
    db.get_or_create_player(big, "t")
    r = db.buy_avatar(big, "base_tank")
    assert r["ok"] is True, r
    assert _is_unlocked(db, big, "base_tank")


def test_premium_avatar_still_routed_to_stars(db):
    db.get_or_create_player(5, "t")
    r = db.buy_avatar(5, "prem_dragon")  # stars — не через обычную покупку
    assert r["ok"] is False
    assert "Stars" in r.get("reason", "")
