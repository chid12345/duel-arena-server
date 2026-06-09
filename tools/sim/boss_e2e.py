"""End-to-end симуляция боя с боссом — 7 боссов x 3 билда x 100 ударов.

Использует свежий SQLite (изолированный, как в pytest-фикстуре).
Прогоняет ВСЕ 7 боссов с тремя билдами игрока:
  - newbie: PLAYER_START (10/10/10) — голый старт
  - epic:   тир T3 уровень 50 (одетый средний игрок)
  - mythic: тир T4 уровень 80 (донат-комплект 6/6 + 5 свитков)

Для каждого боя:
  - 100 ударов по боссу
  - считаем урон через calc_player_damage_to_boss (тот же код что в API)
  - в части ударов окно уязвимости включено (x3)
  - применяем механики босса (демон-вампиризм, голем-броня, тень-фазы, лава-аура)
  - параллельно считаем «ответку» босса каждые 6 сек
  - в итоге: средний урон, max урон, шанс крита, выживет игрок или нет

Запуск: python tools/sim/boss_e2e.py
"""
from __future__ import annotations

import os
import random
import sys
import tempfile
from pathlib import Path

# Корень проекта
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from config.world_boss.types import WB_BOSS_TYPES
from config.world_boss.abilities import (
    wb_regen_pct, wb_player_dmg_mult, wb_is_vuln_window,
)
from repositories.world_boss.damage_calc import (
    calc_player_damage_to_boss, calc_boss_attack_damage,
    PLAYER_HIT_COOLDOWN_MS, BOSS_ATTACK_PCT_HP, BOSS_ATTACK_COOLDOWN_SEC,
    VULNERABILITY_WINDOW_MULT,
)


def make_player(build: str) -> dict:
    if build == "newbie":
        return {
            "strength": 10, "endurance": 10, "crit": 10, "stamina": 10,
            "max_hp": 100, "current_hp": 100, "level": 1,
        }
    if build == "epic":
        # Одетый средний игрок: атака+30, крит+14, HP+200, тир уровня 50.
        return {
            "strength": 50, "endurance": 40, "crit": 35, "stamina": 30,
            "max_hp": 700, "current_hp": 700, "level": 50,
            "double_pct": 0, "lifesteal_pct": 0,
        }
    if build == "mythic":
        # Donат с полным мифик-сетом: атака+90, крит+30, HP+500, двойной 5%, вамп 10%.
        return {
            "strength": 120, "endurance": 80, "crit": 75, "stamina": 60,
            "max_hp": 1500, "current_hp": 1500, "level": 80,
            "double_pct": 5, "lifesteal_pct": 10,
        }
    raise ValueError(build)


def make_scrolls(build: str) -> list[str]:
    if build == "mythic":
        # Все 5 свитков активны
        return ["damage_25", "power_10", "defense_20", "dodge_10", "crit_10"]
    if build == "epic":
        # 2 свитка (среднее)
        return ["damage_25", "defense_20"]
    return []  # newbie без свитков


def simulate_boss_fight(boss: dict, build: str, n_hits: int = 100, seed: int = 42) -> dict:
    """Прогон одного боя: игрок vs босс. Возвращает статистику."""
    rng = random.Random(seed)
    player = make_player(build)
    scrolls = make_scrolls(build)
    boss_profile = boss["stat_profile_base"]
    boss_type = boss["type"]

    # HP босса: 6000 за игрока, минимум 15000. Тут симулируем «один игрок».
    boss_max_hp = max(15000, 6000)
    boss_hp = boss_max_hp

    # Игроку: HP
    player_hp = player["max_hp"]
    player_max_hp = player["max_hp"]

    damage_log: list[int] = []
    crit_count = 0
    vuln_count = 0
    counter_log: list[int] = []
    boss_regen_total = 0
    ability_triggers: dict[str, int] = {}

    # Симулируем время: 100 ударов * 300ms = 30 секунд минимум (кулдаун 300ms между ударами).
    # Окно уязвимости — каждые ~10-12 сек на 2 сек (зависит от босса).
    sim_time_ms = 0
    next_boss_attack_ms = BOSS_ATTACK_COOLDOWN_SEC * 1000

    for hit_idx in range(n_hits):
        # Прошло времени с прошлого удара (300ms — анти-чит).
        sim_time_ms += PLAYER_HIT_COOLDOWN_MS
        elapsed_sec = sim_time_ms / 1000.0
        hp_frac = boss_hp / boss_max_hp if boss_max_hp > 0 else 1.0

        # Окно уязвимости (если фаза активна)
        is_vuln = wb_is_vuln_window(boss_type, hp_frac, elapsed_sec)
        if is_vuln:
            vuln_count += 1

        dmg, is_crit, dbg = calc_player_damage_to_boss(
            player_stats={"strength": player["strength"], "crit": player["crit"]},
            boss_stat_profile=boss_profile,
            scrolls=scrolls,
            is_vulnerability_window=is_vuln,
            rng=rng,
        )
        if is_crit:
            crit_count += 1

        # Механика «фишек» босса (фазы, броня, и т.д.)
        pm = wb_player_dmg_mult(boss_type, hp_frac, is_crit, elapsed_sec)
        if pm != 1.0:
            dmg = max(1, int(dmg * pm))
            ability_triggers[f"dmg_mult_{pm}"] = ability_triggers.get(f"dmg_mult_{pm}", 0) + 1

        # Двойной удар (mythic)
        if player.get("double_pct", 0) and rng.random() < player["double_pct"] / 100:
            dmg = dmg * 2
            ability_triggers["double"] = ability_triggers.get("double", 0) + 1

        damage_log.append(dmg)
        boss_hp = max(0, boss_hp - dmg)

        # Регенерация Демона
        regen_pct = wb_regen_pct(boss_type, boss_hp / boss_max_hp if boss_max_hp > 0 else 0)
        if regen_pct > 0:
            heal = int(dmg * regen_pct)
            boss_hp = min(boss_max_hp, boss_hp + heal)
            boss_regen_total += heal

        # Вампиризм игрока (mythic)
        if player.get("lifesteal_pct", 0) and dmg > 0:
            heal_player = max(1, int(dmg * player["lifesteal_pct"] / 100))
            player_hp = min(player_max_hp, player_hp + heal_player)

        # Ответка босса каждые BOSS_ATTACK_COOLDOWN_SEC секунд
        while sim_time_ms >= next_boss_attack_ms and boss_hp > 0 and player_hp > 0:
            counter, is_dodged, dbg2 = calc_boss_attack_damage(
                player_state={
                    "max_hp": player_max_hp,
                    "endurance": player["endurance"],
                },
                boss_stat_profile=boss_profile,
                scrolls=scrolls,
                rng=rng,
            )
            if not is_dodged:
                counter_log.append(counter)
                player_hp = max(0, player_hp - counter)
            next_boss_attack_ms += BOSS_ATTACK_COOLDOWN_SEC * 1000

        if boss_hp <= 0 or player_hp <= 0:
            break

    return {
        "boss_type": boss_type,
        "boss_label": boss["label"],
        "build": build,
        "hits": len(damage_log),
        "boss_killed": boss_hp <= 0,
        "player_killed": player_hp <= 0,
        "boss_hp_remaining": boss_hp,
        "boss_max_hp": boss_max_hp,
        "player_hp_remaining": player_hp,
        "damage_total": sum(damage_log),
        "damage_avg": round(sum(damage_log) / max(1, len(damage_log)), 1),
        "damage_max": max(damage_log) if damage_log else 0,
        "damage_min": min(damage_log) if damage_log else 0,
        "crit_count": crit_count,
        "crit_pct": round(100 * crit_count / max(1, len(damage_log)), 1),
        "vuln_count": vuln_count,
        "boss_regen_total": boss_regen_total,
        "boss_counter_attacks": len(counter_log),
        "boss_counter_avg": round(sum(counter_log) / max(1, len(counter_log)), 1) if counter_log else 0,
        "abilities": dict(ability_triggers),
        "sim_time_sec": round(sim_time_ms / 1000, 1),
    }


def main():
    print("=" * 100)
    print("BOSS E2E SIMULATION")
    print("=" * 100)
    print(f"{'Boss':10s} {'Build':8s} {'Hits':>4s} {'Killed':>6s} "
          f"{'AvgDmg':>7s} {'Max':>6s} {'Crit%':>5s} {'Vuln#':>5s} "
          f"{'BossHP':>7s} {'BossRegen':>9s} {'Counters':>8s} {'PlrHP':>6s} "
          f"{'Time':>5s} {'Abilities'}")
    print("-" * 100)

    summary_rows = []
    for boss in WB_BOSS_TYPES:
        for build in ("newbie", "epic", "mythic"):
            r = simulate_boss_fight(boss, build, n_hits=100, seed=42)
            summary_rows.append(r)
            killed_str = "YES" if r["boss_killed"] else "NO"
            ab_str = ",".join(f"{k}:{v}" for k, v in list(r["abilities"].items())[:3])
            print(
                f"{r['boss_type']:10s} {r['build']:8s} {r['hits']:>4d} "
                f"{killed_str:>6s} {r['damage_avg']:>7.1f} {r['damage_max']:>6d} "
                f"{r['crit_pct']:>5.1f} {r['vuln_count']:>5d} "
                f"{r['boss_hp_remaining']:>7d} {r['boss_regen_total']:>9d} "
                f"{r['boss_counter_attacks']:>8d} {r['player_hp_remaining']:>6d} "
                f"{r['sim_time_sec']:>5.1f} {ab_str}"
            )
        print("-" * 100)

    # Аномалии
    print("\n" + "=" * 100)
    print("ANOMALIES (если есть)")
    print("=" * 100)
    issues = []
    for r in summary_rows:
        # Голый новичок убивает босса за 100 ударов? — слишком легко
        if r["build"] == "newbie" and r["boss_killed"]:
            issues.append(f"NEWBIE killed {r['boss_type']} in {r['hits']} hits — boss too weak?")
        # Mythic НЕ убил за 100 ударов? — слишком сложно
        if r["build"] == "mythic" and not r["boss_killed"] and r["boss_hp_remaining"] > 1000:
            issues.append(
                f"MYTHIC vs {r['boss_type']}: HP left {r['boss_hp_remaining']} after {r['hits']} hits"
            )
        # Игрок умирает? — должны бы выживать с лечением
        if r["player_killed"]:
            issues.append(f"{r['build']} died to {r['boss_type']} at hit {r['hits']}")
        # Демон должен регенить
        if r["boss_type"] == "demon" and r["boss_regen_total"] == 0:
            issues.append(f"DEMON regen = 0 for {r['build']} — vampirism not triggering")
        # Окно уязвимости — должно быть хоть раз
        if r["vuln_count"] == 0 and r["hits"] > 50:
            issues.append(f"{r['boss_type']} vs {r['build']}: vuln_count=0 (window never opened)")
        # Крит% должен быть ~10-30% для нормальных билдов
        if r["build"] in ("epic", "mythic") and r["crit_pct"] < 5:
            issues.append(f"{r['build']} vs {r['boss_type']}: crit% = {r['crit_pct']} (very low)")

    if issues:
        for i in issues:
            print(f"  ! {i}")
    else:
        print("  No anomalies detected.")

    print("\n" + "=" * 100)
    print(f"Total fights: {len(summary_rows)}")
    print(f"Total damage dealt: {sum(r['damage_total'] for r in summary_rows)}")
    print(f"Total boss regen: {sum(r['boss_regen_total'] for r in summary_rows)}")


if __name__ == "__main__":
    main()
