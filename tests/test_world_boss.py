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
    from config.world_boss_constants import WB_CHEST_TOP_DAMAGE
    from economy.loader import get_world_boss
    WB_DIAMONDS_TOP2 = int(get_world_boss("diamonds_top2"))
    WB_DIAMONDS_TOP3 = int(get_world_boss("diamonds_top3"))
    # 3 игрока, разные вклады. user 1001 — топ-1 (наибольший урон).
    for uid in (1001, 1002, 1003):
        db.get_or_create_player(uid, f"u{uid}")
    spawn_id = _make_spawn(db)
    db.log_wb_hit(spawn_id, 1002, damage=3000)  # топ-2
    db.log_wb_hit(spawn_id, 1003, damage=2000)  # топ-3
    db.log_wb_hit(spawn_id, 1001, damage=5000)  # топ-1

    created = compute_and_create_rewards(db, spawn_id, is_victory=True)
    assert created == 3

    # Топ-1: алмазный сундук, без алмазов (логика обновлена).
    r1 = db.get_wb_reward_by_spawn(spawn_id, 1001)
    assert r1["chest_type"] == WB_CHEST_TOP_DAMAGE, "Топ-1 должен получить алмазный сундук"
    assert r1["is_victory"] == 1
    assert r1["gold"] > 0 and r1["exp"] > 0

    # Топ-2: WB_DIAMONDS_TOP2 алмазов, без сундука.
    r2 = db.get_wb_reward_by_spawn(spawn_id, 1002)
    assert r2["diamonds"] == WB_DIAMONDS_TOP2, f"Топ-2 ждал {WB_DIAMONDS_TOP2} алмазов"

    # Топ-3: WB_DIAMONDS_TOP3 алмазов.
    r3 = db.get_wb_reward_by_spawn(spawn_id, 1003)
    assert r3["diamonds"] == WB_DIAMONDS_TOP3, f"Топ-3 ждал {WB_DIAMONDS_TOP3} алмазов"


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


# ── Test 5: WB-дроп шардов (этап 4D.5 редизайна) ──────────────────────────────

def test_wb_no_longer_drops_shards(db):
    """Решение 2026-05-17: WB больше НЕ даёт шарды.
    Шарды добываются только разборкой ненужного шмота (упрощает экономику).
    """
    from repositories.world_boss.rewards_calc import compute_and_create_rewards

    db.get_or_create_player(4001, "u_t1")
    db.get_or_create_player(4002, "u_t2")
    db.get_or_create_player(4003, "u_t4")
    conn = db.get_connection()
    conn.execute("UPDATE players SET level = 1 WHERE user_id = 4001")
    conn.execute("UPDATE players SET level = 30 WHERE user_id = 4002")
    conn.execute("UPDATE players SET level = 70 WHERE user_id = 4003")
    conn.commit()
    conn.close()

    spawn_id = _make_spawn(db)
    db.log_wb_hit(spawn_id, 4001, damage=1000)
    db.log_wb_hit(spawn_id, 4002, damage=2000)
    db.log_wb_hit(spawn_id, 4003, damage=5000)

    compute_and_create_rewards(db, spawn_id, is_victory=True)

    # Никаких шардов всем участникам — даже топ-1
    assert db.get_shards(4001, "T1") == 0
    assert db.get_shards(4002, "T2") == 0
    assert db.get_shards(4003, "T4") == 0


def test_wb_no_shards_on_defeat(db):
    """Поражение: шарды не выдаются (как и алмазы)."""
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    db.get_or_create_player(4101, "d")
    spawn_id = _make_spawn(db)
    db.log_wb_hit(spawn_id, 4101, damage=1500)

    compute_and_create_rewards(db, spawn_id, is_victory=False)

    # Все шарды = 0 (defeat)
    for t in ("T1", "T2", "T3", "T4"):
        assert db.get_shards(4101, t) == 0


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


# ── Test 7: недельный урон суммируется по рейдам ─────────────────────────────

def test_wb_weekly_score_accumulates_across_raids(db):
    """2 рейда за неделю → урон складывается (1000+700), raids_count=2.

    Регрессия AmbiguousColumn: голый `total_damage` в ON CONFLICT DO UPDATE
    падал в PostgreSQL — второй рейд молча не прибавлялся к недельному итогу.
    """
    from repositories.world_boss.rewards_calc import compute_and_create_rewards
    db.get_or_create_player(5101, "ww")
    sp_a = _make_spawn(db)
    sp_b = _make_spawn(db, scheduled_in_sec=60)
    db.log_wb_hit(sp_a, 5101, damage=1000)
    compute_and_create_rewards(db, sp_a, is_victory=True)
    db.log_wb_hit(sp_b, 5101, damage=700)
    compute_and_create_rewards(db, sp_b, is_victory=True)

    conn = db.get_connection()
    row = conn.execute(
        "SELECT total_damage, raids_count FROM wb_weekly_scores WHERE user_id=5101"
    ).fetchone()
    conn.close()
    assert int(row["total_damage"]) == 1700
    assert int(row["raids_count"]) == 2


# ─── Защита экипировки от ответки босса (2026_05_21) ───

class _FixedRng:
    """rng с фиксированным random() — для детерминированных тестов урона босса."""
    def __init__(self, val):
        self._val = val
    def random(self):
        return self._val


def test_boss_attack_applies_item_defense():
    """Поштучная защита брони (def_pct + body_def_pct → _eq_def_pct_item) снижает
    урон ответки босса. Раньше учитывался только сет-бонус."""
    from repositories.world_boss.damage_calc import calc_boss_attack_damage
    profile = {"str": 1.0, "agi": 1.0, "int": 1.0}
    base = {"max_hp": 1000, "endurance": 5}
    # rng=0.99: не уворот (порог мал), не блок (не задан)
    d_plain, dodged1, _ = calc_boss_attack_damage(dict(base), profile, rng=_FixedRng(0.99))
    d_def, dodged2, _ = calc_boss_attack_damage({**base, "_eq_def_pct_item": 0.30}, profile, rng=_FixedRng(0.99))
    assert not dodged1 and not dodged2
    assert d_def < d_plain, f"защита брони должна снижать урон босса: с защитой={d_def}, без={d_plain}"


def test_boss_attack_block_negates():
    """block_chance=100 (глухой блок брони №2) полностью гасит ответку босса."""
    from repositories.world_boss.damage_calc import calc_boss_attack_damage
    profile = {"str": 1.0, "agi": 1.0, "int": 1.0}
    dmg, blocked, dbg = calc_boss_attack_damage(
        {"max_hp": 1000, "endurance": 5, "_eq_block_chance": 100.0}, profile, rng=_FixedRng(0.99))
    assert dmg == 0 and blocked and dbg.get("blocked")


def test_wb_heal_player_caps_at_max(db):
    """Вампиризм по боссу (wb_heal_player) лечит живого игрока, не выше max_hp."""
    spawn_id = _make_spawn(db)
    db.get_or_create_player(7001, "u_heal")
    db.wb_join_raid(spawn_id, 7001, max_hp=1000, endurance=10, crit=5)
    db.wb_apply_damage_to_player(spawn_id, 7001, 400)   # hp=600
    db.wb_heal_player(spawn_id, 7001, 150)              # hp=750
    ps = db.get_wb_player_state(spawn_id, 7001)
    assert int(ps["current_hp"]) == 750
    db.wb_heal_player(spawn_id, 7001, 99999)           # упирается в max_hp
    ps = db.get_wb_player_state(spawn_id, 7001)
    assert int(ps["current_hp"]) == 1000
