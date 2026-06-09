"""Симуляция РАЙДА: 10 игроков параллельно бьют босса в реальной БД.

Цель — отловить:
  - race conditions в wb_apply_damage_to_boss
  - неправильный шаринг HP босса между игроками
  - двойной апплай рейд-свитков
  - неправильный счёт damage по игроку (для лидерборда)
  - подсчёт онлайна

Использует свежий SQLite (изолированный, как тесты).
Запуск: python tools/sim/boss_raid_db.py
"""
from __future__ import annotations

import os
import random
import sys
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


def make_db():
    """Свежая БД со всеми миксинами (как conftest.py)."""
    from db_core import DBCore
    from db_schema import DBSchema
    from repositories.users import UsersMixin
    from repositories.bots import BotsMixin
    from repositories.battles import BattlesMixin
    from repositories.game_logic import GameLogicMixin
    from repositories.endless import EndlessMixin
    from repositories.leaderboard import LeaderboardMixin
    from repositories.shop import ShopMixin
    from repositories.social import SocialMixin
    from repositories.avatars import AvatarsMixin
    from repositories.inventory import InventoryMixin
    from repositories.quests import QuestsMixin
    from repositories.world_boss import WorldBossMixin
    from repositories.equipment import Armor2ModsMixin, EquipmentMixin
    from repositories.season_pass import SeasonPassMixin, SeasonPassClaimMixin
    from repositories.upgrades import UpgradesMixin
    from repositories.rentals import RentalsMixin

    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp_path = tmp.name
    tmp.close()

    class TestDatabase(
        DBCore, DBSchema,
        BotsMixin, UsersMixin, BattlesMixin,
        GameLogicMixin, EndlessMixin, LeaderboardMixin,
        ShopMixin, SocialMixin, AvatarsMixin, InventoryMixin,
        QuestsMixin, WorldBossMixin, EquipmentMixin, Armor2ModsMixin,
        SeasonPassMixin, SeasonPassClaimMixin, UpgradesMixin,
        RentalsMixin,
    ):
        def __init__(self):
            self._pg = False
            self._db_path = tmp_path
            self.init_database()

        def get_connection(self):
            import sqlite3
            conn = sqlite3.connect(self._db_path, check_same_thread=False, timeout=5.0)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            return conn

    return TestDatabase(), tmp_path


def spawn_boss(db, boss_type: str, max_hp: int = 30000):
    """Создать активный рейд указанного босса."""
    from config.world_boss.types import WB_BOSS_TYPE_BY_KEY
    boss_def = WB_BOSS_TYPE_BY_KEY.get(boss_type)
    if not boss_def:
        raise ValueError(f"Unknown boss type: {boss_type}")

    from datetime import datetime, timezone
    sched_at = datetime.now(timezone.utc).isoformat()
    spawn_id = db.create_wb_spawn(
        scheduled_at=sched_at,
        boss_name=boss_def["label"],
        stat_profile=boss_def["stat_profile_base"],
        max_hp=max_hp,
        boss_type=boss_type,
    )
    db.start_wb_spawn(spawn_id, online_at_start=10, max_hp=max_hp)
    return spawn_id


def create_player(db, user_id: int, build: str):
    """Создать игрока с указанным билдом."""
    db.get_or_create_player(user_id, f"player{user_id}")
    if build == "newbie":
        return
    conn = db.get_connection()
    if build == "epic":
        conn.execute(
            "UPDATE players SET strength=50, endurance=40, crit=35, max_hp=700, "
            "current_hp=700, level=50 WHERE user_id=?",
            (user_id,),
        )
    elif build == "mythic":
        conn.execute(
            "UPDATE players SET strength=120, endurance=80, crit=75, max_hp=1500, "
            "current_hp=1500, level=80 WHERE user_id=?",
            (user_id,),
        )
    conn.commit()
    conn.close()


def hit_boss_thread(db, spawn_id: int, user_id: int, n_hits: int, results: dict, idx: int):
    """Поток одного игрока — бьёт босса n_hits раз."""
    from repositories.world_boss.damage_calc import calc_player_damage_to_boss
    from config.world_boss.types import WB_BOSS_TYPE_BY_KEY

    rng = random.Random(idx)  # разный seed на каждый поток
    dealt_total = 0
    success_hits = 0
    locked_hits = 0

    # Получаем профиль босса
    spawn = db.get_wb_active_spawn()
    boss_profile = WB_BOSS_TYPE_BY_KEY[spawn["boss_type"]]["stat_profile_base"]

    # Регистрируем игрока в рейде
    db.wb_join_raid(spawn_id, user_id, max_hp=1500, endurance=80, crit=75)

    # Получаем статы игрока для урона
    conn = db.get_connection()
    row = conn.execute("SELECT strength, crit FROM players WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    player_stats = {"strength": row["strength"], "crit": row["crit"]}

    for _ in range(n_hits):
        # Анти-чит запись: атомарный кулдаун
        now_ms = int(time.time() * 1000)
        if not db.wb_try_record_hit(spawn_id, user_id, now_ms, 0):
            # cooldown 0 = always allow для теста
            locked_hits += 1
            continue

        dmg, is_crit, _ = calc_player_damage_to_boss(
            player_stats=player_stats,
            boss_stat_profile=boss_profile,
            scrolls=[],
            is_vulnerability_window=False,
            rng=rng,
        )
        new_hp = db.apply_damage_to_boss(spawn_id, dmg)
        if new_hp is None:
            break  # рейд завершён
        dealt_total += dmg
        success_hits += 1
        # Track damage per player для лидерборда
        db.wb_add_player_damage(spawn_id, user_id, dmg)

        if new_hp <= 0:
            break
        time.sleep(0.001)  # уступка GIL

    results[idx] = {
        "user_id": user_id,
        "hits": success_hits,
        "locked": locked_hits,
        "damage_total": dealt_total,
    }


def run_raid(boss_type: str = "fire", n_players: int = 10, hits_per_player: int = 50):
    print(f"\n{'='*80}")
    print(f"RAID SIMULATION: {n_players} mythic players vs {boss_type.upper()}")
    print(f"{'='*80}")

    db, tmp_path = make_db()
    try:
        # Setup
        boss_max_hp = 30000
        spawn_id = spawn_boss(db, boss_type, max_hp=boss_max_hp)
        print(f"Spawned boss: spawn_id={spawn_id}, max_hp={boss_max_hp}")

        for i in range(n_players):
            create_player(db, 10000 + i, "mythic")

        # Параллельный «штурм»
        results = {}
        threads = []
        start = time.time()
        for i in range(n_players):
            t = threading.Thread(
                target=hit_boss_thread,
                args=(db, spawn_id, 10000 + i, hits_per_player, results, i),
            )
            threads.append(t)
            t.start()
        for t in threads:
            t.join()
        elapsed = time.time() - start

        # Анализ
        total_dealt = sum(r["damage_total"] for r in results.values())
        total_hits = sum(r["hits"] for r in results.values())
        total_locked = sum(r["locked"] for r in results.values())

        # Сверяем HP босса в БД
        spawn_after = db.get_wb_active_spawn()
        boss_hp_db = int(spawn_after["current_hp"]) if spawn_after else 0
        expected_hp = max(0, boss_max_hp - total_dealt)

        print(f"\n--- {n_players} players hit boss in parallel ---")
        print(f"Total damage dealt (counted by players): {total_dealt}")
        print(f"Total hits: {total_hits} (locked: {total_locked})")
        print(f"Boss HP in DB:  {boss_hp_db}")
        print(f"Expected HP:    {expected_hp}")
        print(f"Boss killed:    {boss_hp_db <= 0}")
        print(f"Elapsed:        {elapsed:.2f}s")
        print(f"\n--- Per-player damage in DB (лидерборд) ---")

        # Sum per-player damage from world_boss_player_state
        conn = db.get_connection()
        rows = conn.execute(
            "SELECT user_id, total_damage FROM world_boss_player_state WHERE spawn_id=? "
            "ORDER BY total_damage DESC",
            (spawn_id,),
        ).fetchall()
        conn.close()
        sum_dmg = 0
        for r in rows:
            print(f"  user={r['user_id']} dmg={r['total_damage']}")
            sum_dmg += r["total_damage"]

        print(f"\nSUM of per-player damage: {sum_dmg}")
        print(f"vs. total damage to boss: {total_dealt}")

        # Аномалии
        print(f"\n--- ИНВАРИАНТЫ ---")
        anomalies = []
        if boss_hp_db != expected_hp:
            anomalies.append(f"BOSS HP MISMATCH: DB={boss_hp_db}, expected={expected_hp}")
        if sum_dmg != total_dealt:
            anomalies.append(
                f"PER-PLAYER DAMAGE SUM MISMATCH: ленивая сумма={sum_dmg}, реальный урон={total_dealt}"
            )
        if anomalies:
            for a in anomalies:
                print(f"  [FAIL] {a}")
        else:
            print(f"  [OK] HP consistency OK")
            print(f"  [OK] Per-player damage sum = total damage dealt")
            print(f"  [OK] No race conditions detected")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


if __name__ == "__main__":
    # Прогоняем 3 разных боссов с параллельным рейдом
    for boss_type in ["fire", "demon", "lich"]:
        run_raid(boss_type=boss_type, n_players=10, hits_per_player=50)
