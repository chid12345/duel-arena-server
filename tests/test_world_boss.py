"""
tests/test_world_boss.py — smoke-тесты системы Мирового босса.

Покрывают ключевые инварианты:
1) Идемпотентность анонса (wb_try_mark_announced_5min).
2) Идемпотентность per-user push (wb_try_mark_reminders_sent_5min).
3) Счётчик ударов за сегодня (для дейлика dq_wb_hit1).
4) Расчёт наград: победа / поражение, алмазы только на победе.
5) Счётчик побед (для ach_wb_wins) = DISTINCT spawn_id, is_victory=1.
6) Идемпотентность claim_wb_reward.

Запуск: python -m pytest tests/test_world_boss.py -v
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
    """Database со всеми WB-миксинами. Отдельный SQLite-файл на тест."""
    original = os.environ.get("DATABASE_URL")
    os.environ.pop("DATABASE_URL", None)

    from db_core import DBCore
    from db_schema import DBSchema
    from repositories.users import UsersMixin
    from repositories.bots import BotsMixin
    from repositories.shop import ShopMixin
    from repositories.world_boss import WorldBossMixin

    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    class TestDB(DBCore, DBSchema, UsersMixin, BotsMixin, ShopMixin, WorldBossMixin):
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


def _make_spawn(db, scheduled_in_sec: int = 0) -> int:
    ts = datetime.now(timezone.utc) + timedelta(seconds=scheduled_in_sec)
    return db.create_wb_spawn(
        scheduled_at=ts.strftime("%Y-%m-%d %H:%M:%S"),
        boss_name="TestTitan",
        stat_profile={"str": 10, "agi": 10, "int": 10, "def": 10},
        max_hp=10_000,
    )


# ── Test 1: announce flag атомарен ────────────────────────────────────────────

def test_announce_flag_is_idempotent(db):
    spawn_id = _make_spawn(db)
    assert db.wb_try_mark_announced_5min(spawn_id) is True
    # Повторный вызов — уже помечено, возвращает False.
    assert db.wb_try_mark_announced_5min(spawn_id) is False


def test_reminder_flag_is_idempotent(db):
    spawn_id = _make_spawn(db)
    assert db.wb_try_mark_reminders_sent_5min(spawn_id) is True
    assert db.wb_try_mark_reminders_sent_5min(spawn_id) is False


# ── Test 2: счётчик ударов за сегодня (дейлик dq_wb_hit1) ─────────────────────

def test_wb_hits_today_count(db):
    db.get_or_create_player(1001, "u1")
    spawn_id = _make_spawn(db)
    assert db.get_wb_hits_today_count(1001) == 0
    db.log_wb_hit(spawn_id, 1001, damage=50)
    db.log_wb_hit(spawn_id, 1001, damage=80, is_crit=True)
    assert db.get_wb_hits_today_count(1001) == 2


# ── Test 3: расчёт наград — победа ────────────────────────────────────────────

def test_rewards_victory_gives_diamonds_and_chests(db):
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    from config.world_boss_constants import (
        WB_DIAMONDS_TOP1, WB_DIAMONDS_LAST_HIT,
        WB_CHEST_TOP_DAMAGE, WB_CHEST_LAST_HIT,
    )
    # 3 игрока, разные вклады. user 1001 — топ-1 + last-hit.
    for uid in (1001, 1002, 1003):
        db.get_or_create_player(uid, f"u{uid}")
    spawn_id = _make_spawn(db)
    db.log_wb_hit(spawn_id, 1002, damage=2000)
    db.log_wb_hit(spawn_id, 1003, damage=3000)
    db.log_wb_hit(spawn_id, 1001, damage=5000)  # last hit + top1

    created = compute_and_create_rewards(db, spawn_id, is_victory=True)
    assert created == 3

    r1 = db.get_wb_reward_by_spawn(spawn_id, 1001)
    assert r1["diamonds"] >= WB_DIAMONDS_TOP1 + WB_DIAMONDS_LAST_HIT - 1
    # top-1 → diamond chest приоритетнее gold.
    assert r1["chest_type"] == WB_CHEST_TOP_DAMAGE
    assert r1["is_victory"] == 1
    assert r1["gold"] > 0 and r1["exp"] > 0


# ── Test 4: расчёт наград — поражение (алмазов нет) ──────────────────────────

def test_rewards_defeat_no_diamonds(db):
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    db.get_or_create_player(2001, "d1")
    spawn_id = _make_spawn(db)
    db.log_wb_hit(spawn_id, 2001, damage=1500)

    created = compute_and_create_rewards(db, spawn_id, is_victory=False)
    assert created == 1
    r = db.get_wb_reward_by_spawn(spawn_id, 2001)
    assert r["diamonds"] == 0
    assert r["chest_type"] in (None, "")
    assert r["is_victory"] == 0
    # gold/exp всё равно выдаётся, но со штрафным множителем.
    assert r["gold"] > 0


# ── Test 5: победы для ach_wb_wins ────────────────────────────────────────────

def test_wb_wins_count_distinct_spawns(db):
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    db.get_or_create_player(3001, "w1")
    sp_a = _make_spawn(db)
    sp_b = _make_spawn(db, scheduled_in_sec=60)
    sp_c = _make_spawn(db, scheduled_in_sec=120)
    for sp in (sp_a, sp_b):
        db.log_wb_hit(sp, 3001, damage=1000)
        compute_and_create_rewards(db, sp, is_victory=True)
    db.log_wb_hit(sp_c, 3001, damage=500)
    compute_and_create_rewards(db, sp_c, is_victory=False)

    assert db.get_wb_wins_count(3001) == 2  # sp_c — поражение, не считается


# ── Test 6: claim_wb_reward идемпотентен ─────────────────────────────────────

def test_claim_reward_idempotent(db):
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    db.get_or_create_player(4001, "c1")
    sp = _make_spawn(db)
    db.log_wb_hit(sp, 4001, damage=1000)
    compute_and_create_rewards(db, sp, is_victory=True)

    r = db.get_wb_reward_by_spawn(sp, 4001)
    first = db.claim_wb_reward(r["reward_id"], 4001)
    assert first is not None
    # Повторный клейм — возвращает None, строка уже claimed=1.
    second = db.claim_wb_reward(r["reward_id"], 4001)
    assert second is None
