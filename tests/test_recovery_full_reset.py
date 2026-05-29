"""
tests/test_recovery_full_reset.py — recovery-путь USDT доставляет «полный сброс».

Этап 9 аудита: 3 пути доставки USDT (webhook / client crypto_check / фоновый
recovery). Webhook и check выполняли :full_reset:, а recovery — НЕ обрабатывал:
при промахе обоих основных путей инвойс помечался delivered БЕЗ сброса
(деньги списаны, сброс не выполнен). Фикс: recovery теперь делает тот же
wipe_player_profile.
"""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def _noop_send(*a, **k):
    return None


def _set_progress(db, uid, *, level, wins):
    db.get_or_create_player(uid, "t")
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE players SET level=?, wins=?, exp=5000, gold=999 WHERE user_id=?",
        (level, wins, uid),
    )
    conn.commit()
    conn.close()


def _read(db, uid):
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT level, wins, gold FROM players WHERE user_id=?", (uid,))
    r = cur.fetchone()
    conn.close()
    return r


def test_recovery_full_reset_performs_wipe(db):
    """recovery с payload :full_reset: реально сбрасывает уровень/победы,
    кошелёк (золото) сохраняется. Возвращает True (инвойс можно пометить delivered)."""
    from api.payment_routes.recovery_deliver import deliver_recovery_payload
    uid = 9101
    _set_progress(db, uid, level=50, wins=20)
    ok = asyncio.run(deliver_recovery_payload(
        db, manager=None, send_tg_message=_noop_send,
        cache_invalidate=lambda u: None, loop=None,
        uid=uid, inv_id=1, payload=f"uid:{uid}:full_reset:1", diamonds=0,
    ))
    assert ok is True
    row = _read(db, uid)
    assert int(row["level"]) == 1, f"уровень должен сброситься, стал {row['level']}"
    assert int(row["wins"]) == 0, "победы должны обнулиться"
    assert int(row["gold"]) == 999, "золото (кошелёк) должно сохраниться"


def test_auto_settler_full_reset_performs_wipe(db, monkeypatch):
    """jobs.payment_settler → recover_one → _deliver: для payload :full_reset:
    раньше возвращалась заглушка 'full_reset:flagged' БЕЗ wipe (инвойс
    помечался delivered → деньги списаны, премиум/уровень оставались).
    Теперь _deliver реально чистит профиль. Регрессионный тест."""
    from tools import recover_crypto_invoice as rci
    monkeypatch.setattr(rci, "db", db)

    uid = 9103
    _set_progress(db, uid, level=42, wins=17)
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE players SET premium_until='2099-01-01', is_premium=1 WHERE user_id=?",
        (uid,),
    )
    conn.commit(); conn.close()

    kind = rci._deliver(uid, invoice_id=42424242,
                        payload=f"uid:{uid}:full_reset:1", diamonds=0)
    assert kind == "full_reset:wiped", f"вместо wipe вернулось {kind!r}"
    row = _read(db, uid)
    assert int(row["level"]) == 1, "уровень должен сброситься"
    assert int(row["wins"]) == 0, "победы должны обнулиться"
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT premium_until, is_premium FROM players WHERE user_id=?", (uid,))
    r = cur.fetchone()
    conn.close()
    assert r["premium_until"] is None, "Premium должен сняться через auto-settler"
    assert int(r["is_premium"] or 0) == 0, "is_premium-флаг должен сняться"


def test_recovery_diamonds_default_still_ok(db):
    """Обычный алмазный payload (без маркеров) — recovery возвращает True
    и не трогает прогресс (алмазы уже начислены в confirm)."""
    from api.payment_routes.recovery_deliver import deliver_recovery_payload
    uid = 9102
    _set_progress(db, uid, level=30, wins=5)
    ok = asyncio.run(deliver_recovery_payload(
        db, manager=None, send_tg_message=_noop_send,
        cache_invalidate=lambda u: None, loop=None,
        uid=uid, inv_id=2, payload=f"uid:{uid}", diamonds=100,
    ))
    assert ok is True
    row = _read(db, uid)
    assert int(row["level"]) == 30, "обычный алмазный платёж не должен сбрасывать прогресс"
