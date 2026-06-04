"""
tests/test_world_boss_state_n1.py — батч-запрос участников для unclaimed_rewards.

Раньше /world_boss/state делал отдельный SQL на КАЖДУЮ незабранную награду
(N+1). Если у игрока 5 наград — 5 лишних походов в БД на каждый poll
(каждые 3–8 сек). Это давало «подтормаживания» во время боя.

Тесты:
1) Happy path: 2 спавна → 2 списка участников за ОДИН SQL.
2) Пустой ввод → пустой dict (без падений, без запроса).
3) Несуществующий spawn_id → пустой список для него (не падает).
"""
from __future__ import annotations

import os
import sys
import tempfile
from datetime import datetime, timedelta, timezone

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

    if original is not None:
        os.environ["DATABASE_URL"] = original
    try:
        os.unlink(tmp_path)
    except OSError:
        pass


def _make_spawn(db, offset_sec: int = 0) -> int:
    ts = datetime.now(timezone.utc) + timedelta(seconds=offset_sec)
    return db.create_wb_spawn(
        scheduled_at=ts.strftime("%Y-%m-%d %H:%M:%S"),
        boss_name="TestTitan",
        stat_profile={"str": 10, "agi": 10, "int": 10, "def": 10},
        max_hp=10_000,
    )


def test_batch_returns_participants_for_two_spawns(db):
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    from api.world_boss_state import _get_spawns_participants_batch

    # Два отдельных рейда, каждый с двумя игроками
    for uid, name in ((11, "alpha"), (22, "bravo"), (33, "charlie"), (44, "delta")):
        db.get_or_create_player(uid, name)

    sp_a = _make_spawn(db)
    sp_b = _make_spawn(db, offset_sec=60)
    db.log_wb_hit(sp_a, 11, damage=3000)
    db.log_wb_hit(sp_a, 22, damage=1000)
    db.log_wb_hit(sp_b, 33, damage=2000)
    db.log_wb_hit(sp_b, 44, damage=500)
    compute_and_create_rewards(db, sp_a, is_victory=True)
    compute_and_create_rewards(db, sp_b, is_victory=True)

    out = _get_spawns_participants_batch(db, [sp_a, sp_b])
    assert sp_a in out and sp_b in out
    assert len(out[sp_a]) == 2
    assert len(out[sp_b]) == 2
    # contribution_pct сортирован убывая — топ-1 первый
    assert out[sp_a][0]["user_id"] == 11
    assert out[sp_b][0]["user_id"] == 33
    # Имена подтянулись из players
    names_a = {p["name"] for p in out[sp_a]}
    assert names_a == {"alpha", "bravo"}


def test_batch_empty_input_returns_empty_dict(db):
    from api.world_boss_state import _get_spawns_participants_batch
    assert _get_spawns_participants_batch(db, []) == {}


def test_batch_nonexistent_spawn_returns_empty_list(db):
    from api.world_boss_state import _get_spawns_participants_batch
    out = _get_spawns_participants_batch(db, [999_999])
    # Ключ есть, но список пустой — без исключения
    assert out == {999_999: []}


def test_batch_dedupes_repeated_spawn_ids(db):
    """Если случайно передали дубли — функция нормализует и не падает."""
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    from api.world_boss_state import _get_spawns_participants_batch

    db.get_or_create_player(77, "echo")
    sp = _make_spawn(db)
    db.log_wb_hit(sp, 77, damage=1000)
    compute_and_create_rewards(db, sp, is_victory=True)

    out = _get_spawns_participants_batch(db, [sp, sp, sp])
    assert list(out.keys()) == [sp]
    assert len(out[sp]) == 1
    assert out[sp][0]["user_id"] == 77
