"""tests/test_world_boss_unregister.py — отмена регистрации на рейд Мирового босса.

Покрывает:
1) Успешная отмена: запись удаляется, 50 🪙 возвращаются.
2) Идемпотентность: повторный вызов = ok, без второго возврата денег.
3) Отмена недоступна, если рейд уже active (бой идёт).
4) Не зарегистрирован — ok без денежных операций.

Запуск: python -m pytest tests/test_world_boss_unregister.py -v
"""
from __future__ import annotations

import asyncio
import os
import sys
import tempfile
from datetime import datetime, timezone

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def db():
    original = os.environ.get("DATABASE_URL")
    os.environ.pop("DATABASE_URL", None)

    from db_core import DBCore
    from db_schema import DBSchema
    from repositories.users import UsersMixin
    from repositories.bots import BotsMixin
    from repositories.shop import ShopMixin
    from repositories.upgrades import UpgradesMixin
    from repositories.world_boss import WorldBossMixin

    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    class TestDB(DBCore, DBSchema, UsersMixin, BotsMixin, ShopMixin, WorldBossMixin, UpgradesMixin):
        def __init__(self):
            self._pg = False
            self._db_path = tmp_path
            self.init_database()

        def get_connection(self):
            import sqlite3
            c = sqlite3.connect(self._db_path, check_same_thread=False)
            c.row_factory = sqlite3.Row
            c.execute("PRAGMA journal_mode=WAL")
            c.execute("PRAGMA foreign_keys=ON")
            return c

    inst = TestDB()
    yield inst
    try:
        os.unlink(tmp_path)
    except Exception:
        pass
    if original is not None:
        os.environ["DATABASE_URL"] = original


def _make_player(db_, uid: int, gold: int = 1000) -> None:
    conn = db_.get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO players (user_id, username, gold, warrior_type, level) "
        "VALUES (?, ?, ?, 'warrior', 1)",
        (uid, f"player_{uid}", gold),
    )
    conn.commit()
    conn.close()


def _schedule_raid(db_, *, spawn_id: int = 1, scheduled_at_iso: str = None) -> None:
    if scheduled_at_iso is None:
        scheduled_at_iso = datetime.now(timezone.utc).isoformat()
    conn = db_.get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO world_boss_spawns (spawn_id, scheduled_at, status) "
        "VALUES (?, ?, 'scheduled')",
        (spawn_id, scheduled_at_iso),
    )
    conn.commit()
    conn.close()


def _gold(db_, uid: int) -> int:
    conn = db_.get_connection()
    cur = conn.cursor()
    cur.execute("SELECT gold FROM players WHERE user_id=?", (uid,))
    row = cur.fetchone()
    conn.close()
    return int(row["gold"]) if row else 0


def _registered(db_, uid: int, spawn_id: int = 1) -> bool:
    conn = db_.get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT 1 FROM world_boss_registrations WHERE spawn_id=? AND user_id=?",
        (spawn_id, uid),
    )
    found = cur.fetchone() is not None
    conn.close()
    return found


def _make_inner_ctx(db_):
    from api.world_boss_entry import RegisterBody

    def _fake_user(init_data: str):
        return {"id": int(init_data)}  # init_data передаём как uid

    return {"db": db_, "get_user_from_init_data": _fake_user}, RegisterBody


def test_unregister_returns_gold_and_removes_row(db):
    """Главный happy-path: после успешной регистрации unregister снимает
    запись и возвращает 50 🪙 (баланс восстанавливается до изначального)."""
    from api.world_boss_entry import (
        world_boss_register_inner,
        world_boss_unregister_inner,
        WB_ENTRY_FEE,
    )

    _make_player(db, 100, gold=1000)
    _schedule_raid(db, spawn_id=1)
    ctx, RegisterBody = _make_inner_ctx(db)

    # Регистрируемся → 50 списано
    r1 = asyncio.run(world_boss_register_inner(RegisterBody(init_data="100"), **ctx))
    assert r1["ok"] and r1["is_registered"]
    assert _gold(db, 100) == 1000 - WB_ENTRY_FEE
    assert _registered(db, 100)

    # Отменяем → запись удалена, 50 возвращены
    r2 = asyncio.run(world_boss_unregister_inner(RegisterBody(init_data="100"), **ctx))
    assert r2["ok"]
    assert r2["was_registered"] is True
    assert r2["refunded"] == WB_ENTRY_FEE
    assert r2["gold_left"] == 1000
    assert _gold(db, 100) == 1000
    assert not _registered(db, 100)


def test_unregister_idempotent_no_double_refund(db):
    """Повторный вызов не должен задвоить возврат — иначе игрок дублирует золото."""
    from api.world_boss_entry import (
        world_boss_register_inner,
        world_boss_unregister_inner,
        WB_ENTRY_FEE,
    )

    _make_player(db, 200, gold=500)
    _schedule_raid(db, spawn_id=1)
    ctx, RegisterBody = _make_inner_ctx(db)

    asyncio.run(world_boss_register_inner(RegisterBody(init_data="200"), **ctx))
    asyncio.run(world_boss_unregister_inner(RegisterBody(init_data="200"), **ctx))
    assert _gold(db, 200) == 500

    # Второй раз — was_registered=False, refunded=0
    r3 = asyncio.run(world_boss_unregister_inner(RegisterBody(init_data="200"), **ctx))
    assert r3["ok"]
    assert r3["was_registered"] is False
    assert r3["refunded"] == 0
    assert _gold(db, 200) == 500  # деньги НЕ задвоились


def test_unregister_not_registered_is_safe_noop(db):
    """Игрок, который никогда не регистрировался — ok без денежных операций."""
    from api.world_boss_entry import world_boss_unregister_inner

    _make_player(db, 300, gold=777)
    _schedule_raid(db, spawn_id=1)
    ctx, RegisterBody = _make_inner_ctx(db)

    r = asyncio.run(world_boss_unregister_inner(RegisterBody(init_data="300"), **ctx))
    assert r["ok"]
    assert r["was_registered"] is False
    assert r["refunded"] == 0
    assert _gold(db, 300) == 777


def test_unregister_blocked_during_active_raid(db):
    """Когда рейд уже стартовал (active==spawn_id) — отмена закрыта,
    иначе игроки кидали бы взнос обратно после начала боя."""
    from api.world_boss_entry import (
        world_boss_register_inner,
        world_boss_unregister_inner,
        WB_ENTRY_FEE,
    )

    _make_player(db, 400, gold=600)
    _schedule_raid(db, spawn_id=1)
    ctx, RegisterBody = _make_inner_ctx(db)

    asyncio.run(world_boss_register_inner(RegisterBody(init_data="400"), **ctx))
    assert _gold(db, 400) == 600 - WB_ENTRY_FEE

    # Переводим scheduled → active (как это делает планировщик при старте)
    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE world_boss_spawns SET status='active', "
        "started_at=?, current_hp=10000, max_hp=10000 "
        "WHERE spawn_id=?",
        (datetime.now(timezone.utc).isoformat(), 1),
    )
    conn.commit()
    conn.close()

    r = asyncio.run(world_boss_unregister_inner(RegisterBody(init_data="400"), **ctx))
    assert r["ok"] is False
    assert isinstance(r.get("reason"), str) and r["reason"]
    # Деньги НЕ возвращены, запись НЕ удалена — главные инварианты безопасности
    assert _gold(db, 400) == 600 - WB_ENTRY_FEE
    assert _registered(db, 400)


def test_register_idempotent_no_double_charge(db):
    """Двойной register подряд — золото списывается ОДИН раз.
    Сценарий: игрок жмёт «Участвовать» дважды (двойной тап / зависший _regBusy
    флаг). Сервер должен видеть, что запись уже есть, и не списывать второй раз."""
    from api.world_boss_entry import world_boss_register_inner, WB_ENTRY_FEE

    _make_player(db, 500, gold=1000)
    _schedule_raid(db, spawn_id=1)
    ctx, RegisterBody = _make_inner_ctx(db)

    # Первый клик: списали 50, зарегали
    r1 = asyncio.run(world_boss_register_inner(RegisterBody(init_data="500"), **ctx))
    assert r1["ok"] and r1["is_registered"]
    assert _gold(db, 500) == 1000 - WB_ENTRY_FEE
    assert r1["gold_left"] == 1000 - WB_ENTRY_FEE

    # Второй клик: уже зарегистрирован — ok без второго списания
    r2 = asyncio.run(world_boss_register_inner(RegisterBody(init_data="500"), **ctx))
    assert r2["ok"] and r2["is_registered"]
    assert _gold(db, 500) == 1000 - WB_ENTRY_FEE, "Двойного списания быть не должно"
    assert r2["gold_left"] == 1000 - WB_ENTRY_FEE
    assert r2["registrants_count"] == 1, "Регистрация должна быть одна, не две"


def test_register_insufficient_gold_returns_reason(db):
    """Не хватает золота → ok:false с понятным reason. Клиент покажет тост,
    юзер увидит почему «Участвовать» не сработало (раньше молча игнорировалось)."""
    from api.world_boss_entry import world_boss_register_inner, WB_ENTRY_FEE

    _make_player(db, 600, gold=WB_ENTRY_FEE - 1)  # на 1 меньше чем взнос
    _schedule_raid(db, spawn_id=1)
    ctx, RegisterBody = _make_inner_ctx(db)

    r = asyncio.run(world_boss_register_inner(RegisterBody(init_data="600"), **ctx))
    assert r["ok"] is False
    assert "reason" in r and r["reason"], "Должен быть текст причины для тоста"
    # Золото не списано, регистрации нет
    assert _gold(db, 600) == WB_ENTRY_FEE - 1
    assert not _registered(db, 600)
