"""Симулятор масштабирования рейда: 5/10/20/30/50 mythic-игроков vs каждый босс.

Цель: проверить как scales формула HP боса (6000/чел, min 15000) под разный онлайн.
Применяет реальные механики (регенерация Демона, броня Голема и т.д.) и считает
время до смерти, контр-урон, распределение урона между игроками.

Не использует БД — чистая симуляция формул. Запуск: python tools/sim/raid_scaling.py
"""
from __future__ import annotations

import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from config.world_boss.types import WB_BOSS_TYPES
from config.world_boss.abilities import wb_regen_pct, wb_player_dmg_mult, wb_is_vuln_window
from config.world_boss_constants import calc_boss_hp, WB_HP_PER_ONLINE, WB_HP_MIN
from repositories.world_boss.damage_calc import (
    calc_player_damage_to_boss, calc_boss_attack_damage,
    PLAYER_HIT_COOLDOWN_MS, BOSS_ATTACK_COOLDOWN_SEC,
)


def player_mythic():
    return {
        "strength": 120, "endurance": 80, "crit": 75, "stamina": 60,
        "max_hp": 1500, "current_hp": 1500, "level": 80,
        "double_pct": 5, "lifesteal_pct": 10,
    }


def simulate_raid(boss: dict, n_players: int, seed: int = 42) -> dict:
    """Симуляция рейда n_players мификов vs босс. Возвращает статистику."""
    rng = random.Random(seed)
    boss_max_hp = calc_boss_hp(n_players)
    boss_hp = boss_max_hp
    boss_type = boss["type"]
    boss_profile = boss["stat_profile_base"]
    scrolls = ["damage_25", "power_10", "defense_20", "dodge_10", "crit_10"]

    # Создаём n_players игроков с одинаковым билдом
    players = []
    for i in range(n_players):
        p = player_mythic()
        p["uid"] = i
        p["dmg_total"] = 0
        p["hits"] = 0
        p["crits"] = 0
        p["counter_hits"] = 0
        players.append(p)

    # Время симуляции: пока босс не умрёт ИЛИ не пройдёт 5 минут (300 сек)
    sim_time_ms = 0
    next_boss_attack_ms = BOSS_ATTACK_COOLDOWN_SEC * 1000
    boss_regen_total = 0
    deaths = 0

    # Игроки бьют ПО ОЧЕРЕДИ (round-robin), каждый со своим внутренним кулдауном 300мс.
    # На каждый «тик» симуляции каждый живой игрок может ударить один раз.
    # Тик = 300мс (PLAYER_HIT_COOLDOWN_MS).
    tick_ms = PLAYER_HIT_COOLDOWN_MS

    while boss_hp > 0 and sim_time_ms < 300_000:  # cap 5 минут
        sim_time_ms += tick_ms
        elapsed_sec = sim_time_ms / 1000
        hp_frac = boss_hp / boss_max_hp if boss_max_hp > 0 else 1.0
        is_vuln = wb_is_vuln_window(boss_type, hp_frac, elapsed_sec)

        # Каждый живой игрок бьёт раз за тик
        for p in players:
            if p["current_hp"] <= 0:
                continue
            if boss_hp <= 0:
                break
            dmg, is_crit, _ = calc_player_damage_to_boss(
                player_stats={"strength": p["strength"], "crit": p["crit"]},
                boss_stat_profile=boss_profile,
                scrolls=scrolls,
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

            # Регенерация Демона
            regen_pct = wb_regen_pct(boss_type, boss_hp / boss_max_hp if boss_max_hp > 0 else 0)
            if regen_pct > 0 and boss_hp > 0:
                heal = int(dmg * regen_pct)
                boss_hp = min(boss_max_hp, boss_hp + heal)
                boss_regen_total += heal

            # Вампиризм игрока
            if dmg > 0:
                heal_p = max(1, int(dmg * p["lifesteal_pct"] / 100))
                p["current_hp"] = min(p["max_hp"], p["current_hp"] + heal_p)

        # Ответка босса каждые 6 сек — бьёт случайного живого
        while sim_time_ms >= next_boss_attack_ms and boss_hp > 0:
            alive = [p for p in players if p["current_hp"] > 0]
            if not alive:
                break
            target = rng.choice(alive)
            counter, is_dodged, _ = calc_boss_attack_damage(
                player_state={"max_hp": target["max_hp"], "endurance": target["endurance"]},
                boss_stat_profile=boss_profile,
                scrolls=scrolls,
                rng=rng,
            )
            if not is_dodged:
                target["current_hp"] = max(0, target["current_hp"] - counter)
                target["counter_hits"] += 1
                if target["current_hp"] <= 0:
                    deaths += 1
            next_boss_attack_ms += BOSS_ATTACK_COOLDOWN_SEC * 1000

    # Анализ распределения урона
    damages = sorted([p["dmg_total"] for p in players], reverse=True)
    total_dmg = sum(damages)
    top_share = damages[0] / total_dmg if total_dmg > 0 else 0
    bottom_share = damages[-1] / total_dmg if total_dmg > 0 else 0
    fairness = damages[-1] / damages[0] if damages[0] > 0 else 0  # 1.0 = perfect

    return {
        "boss": boss_type,
        "n_players": n_players,
        "boss_max_hp": boss_max_hp,
        "boss_killed": boss_hp <= 0,
        "boss_hp_remaining": boss_hp,
        "time_sec": round(sim_time_ms / 1000, 1),
        "total_dmg": total_dmg,
        "regen_total": boss_regen_total,
        "deaths": deaths,
        "top_dmg": damages[0] if damages else 0,
        "bot_dmg": damages[-1] if damages else 0,
        "top_share_pct": round(top_share * 100, 1),
        "fairness": round(fairness, 2),  # 1.0 = все наносят одинаково; 0.5 = низ в 2 раза меньше топа
    }


def main():
    print("=" * 110)
    print("RAID SCALING SIMULATION — Mythic players vs Boss")
    print("=" * 110)
    print(f"{'Boss':10s} {'N':>3s} {'BossHP':>7s} {'Killed':>6s} {'Time':>6s} "
          f"{'Damage':>9s} {'Regen':>7s} {'Deaths':>6s} "
          f"{'TopDmg':>8s} {'BotDmg':>8s} {'Top%':>5s} {'Fair':>5s}")
    print("-" * 110)

    rows = []
    for boss in WB_BOSS_TYPES:
        for n in (5, 10, 20, 30, 50):
            r = simulate_raid(boss, n, seed=42)
            rows.append(r)
            killed = "YES" if r["boss_killed"] else "NO"
            print(
                f"{r['boss']:10s} {n:>3d} {r['boss_max_hp']:>7d} {killed:>6s} "
                f"{r['time_sec']:>5.1f}s "
                f"{r['total_dmg']:>9d} {r['regen_total']:>7d} {r['deaths']:>6d} "
                f"{r['top_dmg']:>8d} {r['bot_dmg']:>8d} "
                f"{r['top_share_pct']:>4.1f}% {r['fairness']:>5.2f}"
            )
        print("-" * 110)

    print("\nLegend: Top%% - dolya urona u top-1 igroka. Fair=1.0 -> vse nanosyat odinakovo.")
    print("Time: vremya do smerti bossa (cap 300s). Esli 300s - boss ne ubit.")

    print("\n" + "=" * 110)
    print("ANALIZ")
    print("=" * 110)
    issues = []
    for r in rows:
        if not r["boss_killed"]:
            issues.append(f"{r['boss']} N={r['n_players']}: NE ubit za 5 min (HP ostalos {r['boss_hp_remaining']})")
        elif r["time_sec"] < 2:
            issues.append(f"{r['boss']} N={r['n_players']}: ubit za {r['time_sec']}s - slishkom bystro")
        elif r["time_sec"] > 180:
            issues.append(f"{r['boss']} N={r['n_players']}: ubit za {r['time_sec']}s - medlenno")
        if r["fairness"] < 0.4 and r["n_players"] >= 10:
            issues.append(
                f"{r['boss']} N={r['n_players']}: spravedlivost {r['fairness']:.2f} - "
                f"top {r['top_dmg']} vs niz {r['bot_dmg']} - {r['top_dmg']/max(1,r['bot_dmg']):.1f}x"
            )

    if issues:
        for i in issues:
            print(f"  ! {i}")
    else:
        print("  Net anomalii - reyd masshtabiruetsya rovno.")


if __name__ == "__main__":
    main()
