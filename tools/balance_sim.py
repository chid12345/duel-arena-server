"""
Монте-Карло по боевой формуле (как в battle_system._calculate_damage_detailed).
Запуск из корня проекта:  python balance_sim.py --battles 500

База не обязательна — улучшения за золото не подтягиваются (user_id=None).
"""

from __future__ import annotations

import argparse
import random
import statistics
import sys
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from battle_system import battle_system  # noqa: E402

ZONES = ["ГОЛОВА", "ТУЛОВИЩЕ", "НОГИ"]


def entity(strength: int, endurance: int, max_hp: int, level: int = 1) -> dict:
    return {
        "user_id": None,
        "username": "sim",
        "strength": strength,
        "endurance": endurance,
        "max_hp": max_hp,
        "current_hp": max_hp,
        "level": level,
    }


def simulate_battle(p1: dict, p2: dict, max_rounds: int = 250) -> dict:
    a = {**p1, "current_hp": p1["max_hp"]}
    b = {**p2, "current_hp": p2["max_hp"]}
    rounds = 0
    zero_outcomes = 0
    total_outcomes = 0
    dmg_positive: list[int] = []

    while a["current_hp"] > 0 and b["current_hp"] > 0 and rounds < max_rounds:
        rounds += 1
        za1, zd1 = random.choice(ZONES), random.choice(ZONES)
        za2, zd2 = random.choice(ZONES), random.choice(ZONES)
        d1, _ = battle_system._calculate_damage_detailed(a, b, za1, zd2)
        d2, _ = battle_system._calculate_damage_detailed(b, a, za2, zd1)
        for d in (d1, d2):
            total_outcomes += 1
            if d == 0:
                zero_outcomes += 1
            else:
                dmg_positive.append(d)
        b["current_hp"] = max(0, b["current_hp"] - d1)
        a["current_hp"] = max(0, a["current_hp"] - d2)

    if a["current_hp"] <= 0 and b["current_hp"] <= 0:
        winner = "draw"
    elif b["current_hp"] <= 0:
        winner = "p1"
    elif a["current_hp"] <= 0:
        winner = "p2"
    else:
        winner = "timeout"

    return {
        "rounds": rounds,
        "winner": winner,
        "zero_frac": zero_outcomes / total_outcomes if total_outcomes else 0.0,
        "dmg_samples": dmg_positive,
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Симуляция боёв Duel Arena (бот vs бот профили)")
    ap.add_argument("--battles", type=int, default=500, help="Сколько боёв прогнать")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()
    if args.seed is not None:
        random.seed(args.seed)

    # Типичные билды: «как у новичка» vs зеркало / чуть тяжелее
    p_a = entity(13, 13, 110, 2)
    p_b = entity(13, 13, 120, 2)

    rounds_list: list[int] = []
    wins_p1 = 0
    all_dmg: list[int] = []
    zero_fracs: list[float] = []

    for _ in range(args.battles):
        r = simulate_battle(p_a, p_b)
        rounds_list.append(r["rounds"])
        zero_fracs.append(r["zero_frac"])
        all_dmg.extend(r["dmg_samples"])
        if r["winner"] == "p1":
            wins_p1 += 1
        elif r["winner"] == "timeout":
            pass

    print(f"Профиль A: сила {p_a['strength']} ловк {p_a['endurance']} HP {p_a['max_hp']} ур.{p_a['level']}")
    print(f"Профиль B: сила {p_b['strength']} ловк {p_b['endurance']} HP {p_b['max_hp']} ур.{p_b['level']}")
    print(f"Боёв: {args.battles}  |  Побед A: {wins_p1} ({100 * wins_p1 / args.battles:.1f}%)")
    print(f"Раундов: среднее {statistics.mean(rounds_list):.2f}, медиана {statistics.median(rounds_list):.1f}, min {min(rounds_list)}, max {max(rounds_list)}")
    if all_dmg:
        print(f"Урон (если >0): среднее {statistics.mean(all_dmg):.2f}, медиана {statistics.median(all_dmg):.1f}")
    print(f"Доля «0 урона» за размен (блок/мимо/уворот): среднее {100 * statistics.mean(zero_fracs):.1f}%")
    print("\nПодсказка: поменяйте p_a/p_b в balance_sim.py под свои билды и сравните раунды/победы.")


if __name__ == "__main__":
    main()
