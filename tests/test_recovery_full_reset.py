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
