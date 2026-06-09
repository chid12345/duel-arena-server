"""Симулятор смешанного рейда: игроки разных уровней (нуб 5ур, золото 20ур, алмазы 50ур, мифик 80ур).

Цель: понять как новички/средние/мифики чувствуют себя в общем рейде.
Параметры:
  - Малый рейд: 10 игроков (2 нуба + 5 средних + 3 мифика)
  - Средний рейд: 20 (5 + 10 + 5)
  - Большой рейд: 30 (10 + 15 + 5)

После рейда — таблица наград (gold/xp/diamonds/сундук) по уровням.

Запуск: python tools/sim/raid_mixed_levels.py
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from config.world_boss.types import WB_BOSS_TYPES, WB_BOSS_TYPE_BY_KEY
from config.world_boss.abilities import wb_regen_pct, wb_player_dmg_mult, wb_is_vuln_window
from config.world_boss_constants import calc_boss_hp
from repositories.world_boss.damage_calc import (
    calc_player_damage_to_boss, calc_boss_attack_damage,
    PLAYER_HIT_COOLDOWN_MS, BOSS_ATTACK_COOLDOWN_SEC,
)
from progression_loader import victory_xp_for_player_level
from economy.loader import get_world_boss


PLAYER_BUILDS = {
    "newbie": {  # 5 уровень, голый стартер
        "level": 5, "strength": 12, "endurance": 11, "crit": 11, "stamina": 10,
        "max_hp": 130, "scrolls_count": 0,
        "double_pct": 0, "lifesteal_pct": 0,
    },
    "gold": {  # 20 уровень, золотой сет (3-4 предмета T2)
        "level": 20, "strength": 35, "endurance": 25, "crit": 22, "stamina": 20,
        "max_hp": 400, "scrolls_count": 1,
        "double_pct": 0, "lifesteal_pct": 0,
    },
    "diamond": {  # 50 уровень, алмазный сет (T3)
        "level": 50, "strength": 70, "endurance": 50, "crit": 45, "stamina": 40,
        "max_hp": 900, "scrolls_count": 3,
        "double_pct": 2, "lifesteal_pct": 5,
    },
    "mythic": {  # 80 уровень, мифик-донат (T4 6/6 + 5 свитков)
        "level": 80, "strength": 120, "endurance": 80, "crit": 75, "stamina": 60,
        "max_hp": 1500, "scrolls_count": 5,
        "double_pct": 5, "lifesteal_pct": 10,
    },
}

SCROLLS_BY_COUNT = {
    0: [],
    1: ["damage_25"],
    2: ["damage_25", "power_10"],
    3: ["damage_25", "power_10", "defense_20"],
    4: ["damage_25", "power_10", "defense_20", "dodge_10"],
    5: ["damage_25", "power_10", "defense_20", "dodge_10", "crit_10"],
}


def make_player(build_key: str, uid: int):
    p = dict(PLAYER_BUILDS[build_key])
    p["uid"] = uid
    p["build"] = build_key
    p["current_hp"] = p["max_hp"]
    p["scrolls"] = SCROLLS_BY_COUNT[p["scrolls_count"]]
    p["dmg_total"] = 0
    p["hits"] = 0
    p["crits"] = 0
    p["counter_hits"] = 0
    p["died"] = False
    return p


def simulate_mixed_raid(boss_type: str, composition: dict, seed: int = 42) -> dict:
    """Симулирует рейд смешанного состава. composition = {build: count}."""
    rng = random.Random(seed)
    boss = WB_BOSS_TYPE_BY_KEY[boss_type]
    boss_profile = boss["stat_profile_base"]

    players = []
    uid = 1
    for build, n in composition.items():
        for _ in range(n):
            players.append(make_player(build, uid))
            uid += 1
    n_players = len(players)
    boss_max_hp = calc_boss_hp(n_players)
    boss_hp = boss_max_hp

    sim_time_ms = 0
    next_boss_attack_ms = BOSS_ATTACK_COOLDOWN_SEC * 1000
    boss_regen_total = 0
    tick_ms = PLAYER_HIT_COOLDOWN_MS

    while boss_hp > 0 and sim_time_ms < 300_000:
        sim_time_ms += tick_ms
        elapsed_sec = sim_time_ms / 1000
        hp_frac = boss_hp / boss_max_hp if boss_max_hp > 0 else 1.0
        is_vuln = wb_is_vuln_window(boss_type, hp_frac, elapsed_sec)

        for p in players:
            if p["died"] or boss_hp <= 0:
                continue
            dmg, is_crit, _ = calc_player_damage_to_boss(
                player_stats={"strength": p["strength"], "crit": p["crit"]},
                boss_stat_profile=boss_profile,
                scrolls=p["scrolls"],
                is_vulnerability_window=is_vuln,
                rng=rng,
            )
            pm = wb_player_dmg_mult(boss_type, hp_frac, is_crit, elapsed_sec)
            if pm != 1.0:
                dmg = max(1, int(dmg * pm))
            if rng.random() < p["double_pct"] / 100:
                dmg = dmg * 2
            p["dmg_total"] += dmg
            p["hits"] += 1
            if is_crit:
                p["crits"] += 1
            boss_hp = max(0, boss_hp - dmg)

            regen_pct = wb_regen_pct(boss_type, boss_hp / boss_max_hp if boss_max_hp > 0 else 0)
            if regen_pct > 0 and boss_hp > 0:
                heal = int(dmg * regen_pct)
                boss_hp = min(boss_max_hp, boss_hp + heal)
                boss_regen_total += heal

            if dmg > 0 and p["lifesteal_pct"] > 0:
                heal_p = max(1, int(dmg * p["lifesteal_pct"] / 100))
                p["current_hp"] = min(p["max_hp"], p["current_hp"] + heal_p)

        # Ответка босса — случайному живому
        while sim_time_ms >= next_boss_attack_ms and boss_hp > 0:
            alive = [p for p in players if not p["died"]]
            if not alive:
                break
            target = rng.choice(alive)
            counter, is_dodged, _ = calc_boss_attack_damage(
                player_state={"max_hp": target["max_hp"], "endurance": target["endurance"]},
                boss_stat_profile=boss_profile,
                scrolls=target["scrolls"],
                rng=rng,
            )
            if not is_dodged:
                target["current_hp"] = max(0, target["current_hp"] - counter)
                target["counter_hits"] += 1
                if target["current_hp"] <= 0:
                    target["died"] = True
            next_boss_attack_ms += BOSS_ATTACK_COOLDOWN_SEC * 1000

    # Награды
    total_dmg = sum(p["dmg_total"] for p in players)
    is_victory = boss_hp <= 0
    mult = get_world_boss("reward_mult_victory") if is_victory else get_world_boss("reward_mult_defeat")
    pool_gold = int(get_world_boss("pool_base")) + int(get_world_boss("gold_contrib_per_player")) * n_players

    sorted_by_dmg = sorted(players, key=lambda p: p["dmg_total"], reverse=True)
    top1 = sorted_by_dmg[0]["uid"] if sorted_by_dmg else None
    top2 = sorted_by_dmg[1]["uid"] if len(sorted_by_dmg) > 1 else None
    top3 = sorted_by_dmg[2]["uid"] if len(sorted_by_dmg) > 2 else None

    for p in players:
        contribution = p["dmg_total"] / total_dmg if total_dmg > 0 else 0
        p["contribution_pct"] = round(contribution * 100, 2)
        p["gold_reward"] = int(pool_gold * contribution * mult)
        base_xp = victory_xp_for_player_level(p["level"])
        guaranteed = base_xp * get_world_boss("xp_guaranteed_pct")
        contrib_xp = base_xp * get_world_boss("xp_contrib_mult") * contribution
        p["xp_reward"] = int((guaranteed + contrib_xp) * mult)
        # Алмазы топ-3
        p["diamond_reward"] = 0
        p["chest"] = None
        if is_victory and p["uid"] == top1:
            p["chest"] = "wb_diamond_chest"
        elif is_victory and p["uid"] == top2:
            p["diamond_reward"] = int(get_world_boss("diamonds_top2"))
        elif is_victory and p["uid"] == top3:
            p["diamond_reward"] = int(get_world_boss("diamonds_top3"))

    return {
        "boss_type": boss_type,
        "n_players": n_players,
        "composition": composition,
        "boss_max_hp": boss_max_hp,
        "boss_killed": is_victory,
        "time_sec": round(sim_time_ms / 1000, 1),
        "total_dmg": total_dmg,
        "boss_regen": boss_regen_total,
        "players": players,
    }


def report_raid(r: dict):
    print(f"\n--- Boss: {r['boss_type'].upper()}, Players: {r['n_players']} "
          f"(comp: {r['composition']}), HP={r['boss_max_hp']} ---")
    print(f"Killed: {r['boss_killed']}, Time: {r['time_sec']}s, "
          f"TotalDmg: {r['total_dmg']}, BossRegen: {r['boss_regen']}")

    # Группировка по билду
    by_build = {}
    for p in r["players"]:
        by_build.setdefault(p["build"], []).append(p)

    print(f"\n  {'Build':10s} {'N':>2s} {'AvgDmg':>7s} {'AvgGold':>7s} {'AvgXP':>6s} "
          f"{'AvgContrib%':>11s} {'Deaths':>6s} {'TotalGold':>9s} {'TotalDmd':>8s}")
    for build, ps in by_build.items():
        n = len(ps)
        avg_dmg = sum(p["dmg_total"] for p in ps) // n
        avg_gold = sum(p["gold_reward"] for p in ps) // n
        avg_xp = sum(p["xp_reward"] for p in ps) // n
        avg_contrib = sum(p["contribution_pct"] for p in ps) / n
        deaths = sum(1 for p in ps if p["died"])
        total_gold = sum(p["gold_reward"] for p in ps)
        total_diamonds = sum(p["diamond_reward"] for p in ps)
        chest = sum(1 for p in ps if p["chest"])
        chest_str = f"+{chest}chest" if chest else ""
        print(f"  {build:10s} {n:>2d} {avg_dmg:>7d} {avg_gold:>7d} {avg_xp:>6d} "
              f"{avg_contrib:>10.1f}% {deaths:>6d} {total_gold:>9d} "
              f"{total_diamonds:>4d}+{chest:1d}chst")


def main():
    scenarios = [
        {"name": "Maly reyd (10)", "comp": {"newbie": 2, "gold": 5, "mythic": 3}},
        {"name": "Sredny reyd (20)", "comp": {"newbie": 5, "gold": 10, "mythic": 5}},
        {"name": "Bolshoy reyd (30)", "comp": {"newbie": 10, "gold": 15, "mythic": 5}},
        {"name": "Bolshoy reyd (30) s diamondami", "comp": {"newbie": 5, "gold": 10, "diamond": 10, "mythic": 5}},
        {"name": "Megareyd (50)", "comp": {"newbie": 20, "gold": 20, "mythic": 10}},
    ]

    for boss_type in ("fire", "demon", "lava"):
        print("\n" + "=" * 110)
        print(f"BOSS: {boss_type.upper()}")
        print("=" * 110)
        for sc in scenarios:
            r = simulate_mixed_raid(boss_type, sc["comp"], seed=42)
            report_raid(r)

    # Финальный анализ
    print("\n" + "=" * 110)
    print("VYVODY")
    print("=" * 110)
    print("1. Esli newbie poluchaet menshe 50 zolota i 30 xp - chuvstvo besposleznosti, balans plokho.")
    print("2. Esli newbie umiraet kazhdy raz - novichki ne mogut igrat, plokho.")
    print("3. Esli mythic zabiraet 80%+ uron - ekspluatatsiya soperov, plokho.")
    print("4. Otkryvayte tablitsu i smotrite po balansu.")


if __name__ == "__main__":
    main()
