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


def test_wb_heal_boss_pct(db):
    """Хил босса долей max_hp (Жатва/Жажда): кап и без воскрешения."""
    spawn_id = _make_spawn(db)
    db.start_wb_spawn(spawn_id, online_at_start=10, max_hp=10000)  # active, hp=10000
    db.apply_damage_to_boss(spawn_id, 5000)                        # hp=5000
    assert db.wb_heal_boss_pct(spawn_id, 0.10) == 6000            # +10% max_hp
    assert db.wb_heal_boss_pct(spawn_id, 5.0) == 10000           # упирается в max_hp
    db.apply_damage_to_boss(spawn_id, 10000)                       # hp=0
    db.wb_heal_boss_pct(spawn_id, 0.5)                            # не воскрешает
    assert int(db.get_wb_spawn(spawn_id)["current_hp"]) == 0


def test_lava_raid_end_to_end(db):
    """E2E «своими руками»: реальный боевой код Лавы против БД.
    Проверяем что игрок РЕАЛЬНО получает урон: ответка + извержения, и что
    на 50% HP Лава разъяряется (stage=2). Это тот же код, что крутится в проде.
    """
    from jobs.world_boss_battle_tick import _check_crown_strikes
    from jobs.world_boss_counter import do_boss_counter_attack
    from config.world_boss.abilities import wb_periodic_aoe

    profile = {"str": 1.4, "agi": 0.75, "int": 1.0}  # лавовый профиль
    spawn_id = db.create_wb_spawn(
        scheduled_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        boss_name="Вулканический Страж", stat_profile=profile,
        max_hp=10000, boss_type="lava",
    )
    db.start_wb_spawn(spawn_id, online_at_start=1, max_hp=10000)  # active, hp=10000
    db.get_or_create_player(9100, "tester")
    db.wb_join_raid(spawn_id, 9100, max_hp=5000, endurance=5, crit=5)
    db.log_wb_hit(spawn_id, 9100, damage=100)        # чтобы попасть в топ (цель ответки)
    db.wb_add_player_damage(spawn_id, 9100, 100)

    # 1) Ответка Лавы реально бьёт игрока.
    before = int(db.get_wb_player_state(spawn_id, 9100)["current_hp"])
    for _ in range(4):
        do_boss_counter_attack(db, spawn_id, profile, "lava", 0.9)
    after = int(db.get_wb_player_state(spawn_id, 9100)["current_hp"])
    assert after < before, "Лава должна бить игрока ответкой"

    # 2) Извержение (Толчки): периодический AoE капает HP по всем живым.
    pct = wb_periodic_aoe("lava", 0.9, 30)           # тик толчка (каждые 30с)
    assert pct > 0
    hp1 = int(db.get_wb_player_state(spawn_id, 9100)["current_hp"])
    db.wb_aoe_damage_all_alive(spawn_id, pct)
    hp2 = int(db.get_wb_player_state(spawn_id, 9100)["current_hp"])
    assert hp2 < hp1, "Извержение должно капать HP игроку"

    # 3) На 50% HP — ярость (stage=2): тот же _check_crown_strikes что в тике.
    db.apply_damage_to_boss(spawn_id, 5500)          # boss hp=4500 (45% ≤ 50%)
    sp = db.get_wb_spawn(spawn_id)
    _check_crown_strikes(db, spawn_id, int(sp["current_hp"]), 10000, profile, "lava")
    assert int(db.get_wb_spawn(spawn_id).get("stage") or 1) == 2, \
        "На 50% HP Лава должна разъяриться (stage=2)"


def test_demon_vampirism_e2e(db):
    """E2E: Демон реально лечится, когда бьёт игрока ответкой («Кровавый пир»)."""
    from jobs.world_boss_counter import do_boss_counter_attack
    profile = {"str": 1.25, "agi": 1.05, "int": 0.9}
    spawn_id = db.create_wb_spawn(
        scheduled_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        boss_name="Кровавый Демон", stat_profile=profile, max_hp=10000, boss_type="demon",
    )
    db.start_wb_spawn(spawn_id, online_at_start=1, max_hp=10000)
    db.apply_damage_to_boss(spawn_id, 5000)          # boss hp=5000
    db.get_or_create_player(9200, "vtester")
    db.wb_join_raid(spawn_id, 9200, max_hp=5000, endurance=5, crit=5)
    db.log_wb_hit(spawn_id, 9200, damage=100)
    db.wb_add_player_damage(spawn_id, 9200, 100)
    boss_before = int(db.get_wb_spawn(spawn_id)["current_hp"])  # 5000
    for _ in range(5):
        do_boss_counter_attack(db, spawn_id, profile, "demon", 0.5)  # ≤50% → вампир 50%
    boss_after = int(db.get_wb_spawn(spawn_id)["current_hp"])
    assert boss_after > boss_before, "Демон должен лечиться от ответки (вампиризм)"


def test_lich_reap_heals_on_death_e2e(db):
    """E2E: Лич «Жатва» — лечится, когда игрок гибнет на ≤25% HP босса."""
    from jobs.world_boss_counter import do_boss_counter_attack
    profile = {"str": 0.95, "agi": 1.2, "int": 1.05}
    spawn_id = db.create_wb_spawn(
        scheduled_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        boss_name="Проклятый Рыцарь", stat_profile=profile, max_hp=10000, boss_type="lich",
    )
    db.start_wb_spawn(spawn_id, online_at_start=1, max_hp=10000)
    db.apply_damage_to_boss(spawn_id, 8000)          # boss hp=2000 (20% ≤ 25%)
    db.get_or_create_player(9300, "fragile")
    db.wb_join_raid(spawn_id, 9300, max_hp=100, endurance=1, crit=1)
    db.log_wb_hit(spawn_id, 9300, damage=50)
    db.wb_add_player_damage(spawn_id, 9300, 50)
    boss_before = int(db.get_wb_spawn(spawn_id)["current_hp"])  # 2000
    for _ in range(25):
        do_boss_counter_attack(db, spawn_id, profile, "lich", 0.2)  # ≤25% → Жатва
        if int(db.get_wb_player_state(spawn_id, 9300).get("is_dead") or 0):
            break
    ps = db.get_wb_player_state(spawn_id, 9300)
    boss_after = int(db.get_wb_spawn(spawn_id)["current_hp"])
    assert int(ps.get("is_dead") or 0) == 1, "игрок должен погибнуть от ответки"
    assert boss_after > boss_before, "Лич должен полечиться на смерть игрока (Жатва +3%)"


def test_wb_count_dead(db):
    """Подсчёт павших в рейде (Лич «Армия мёртвых»)."""
    spawn_id = _make_spawn(db)
    db.get_or_create_player(8001, "d1")
    db.get_or_create_player(8002, "d2")
    db.wb_join_raid(spawn_id, 8001, max_hp=100, endurance=5, crit=5)
    db.wb_join_raid(spawn_id, 8002, max_hp=100, endurance=5, crit=5)
    assert db.wb_count_dead(spawn_id) == 0
    db.wb_apply_damage_to_player(spawn_id, 8001, 200)  # добиваем 8001
    assert db.wb_count_dead(spawn_id) == 1


def test_wb_heal_boss_caps_and_no_revive(db):
    """Вампиризм Демона (wb_heal_boss): лечит босса не выше max_hp и НЕ воскрешает добитого."""
    spawn_id = _make_spawn(db)
    db.start_wb_spawn(spawn_id, online_at_start=10, max_hp=10000)  # active, hp=10000
    db.apply_damage_to_boss(spawn_id, 4000)                        # hp=6000
    assert db.wb_heal_boss(spawn_id, 1000) == 7000
    assert db.wb_heal_boss(spawn_id, 999999) == 10000             # упирается в max_hp
    db.apply_damage_to_boss(spawn_id, 10000)                       # hp=0 (добит)
    db.wb_heal_boss(spawn_id, 5000)                                # не должно воскресить
    sp = db.get_wb_spawn(spawn_id)
    assert int(sp["current_hp"]) == 0


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
