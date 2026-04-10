"""Монте-Карло прогон и текст отчёта."""

from __future__ import annotations

import random
import sys
from datetime import datetime
from typing import List, Optional

from balance_simulation.core import SimBattleSystem, build_synthetic_player, fetch_bot, run_one_battle


def _build_report_lines(
    valid: int,
    player_level: int,
    bot_level: Optional[int],
    seed: Optional[int],
    wins: int,
    sum_rounds: int,
    sum_d_opp: int,
    sum_d_you: int,
) -> List[str]:
    bot_desc = str(bot_level) if bot_level is not None else "как у игрока"
    lines = [
        f'Дата: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
        f'Команда: {" ".join(sys.argv)}',
        "",
        f"Боёв: {valid}  (ур. игрока {player_level}, цель подбора бота: {bot_desc})",
    ]
    if seed is not None:
        lines.append(f"seed: {seed}")
    lines.extend(
        [
            f"Побед игрока: {100.0 * wins / valid:.1f}% ({wins}/{valid})",
            f"Среднее раундов: {sum_rounds / valid:.2f}",
            f"Средний урон по врагу за бой: {sum_d_opp / valid:.1f} HP",
            f"Средний урон по вам за бой: {sum_d_you / valid:.1f} HP",
        ]
    )
    return lines


async def run_monte_carlo(
    n: int,
    player_level: int,
    bot_level: Optional[int],
    seed: Optional[int],
    output_path: Optional[str],
    *,
    project_root: str,
) -> None:
    import os

    rng = random.Random(seed)
    sim_uid = 900_000_001
    player_base = build_synthetic_player(player_level, sim_uid, rng)

    wins = 0
    sum_rounds = 0
    sum_d_opp = 0
    sum_d_you = 0
    valid = 0

    bs = SimBattleSystem()

    for _i in range(n):
        p = {**player_base, "current_hp": player_base["max_hp"]}
        target_lv = bot_level if bot_level is not None else player_level
        bot = fetch_bot(target_lv)
        if not bot:
            print("В базе нет ботов. Запустите бота хотя бы раз, чтобы создалась таблица bots.")
            return

        r = await run_one_battle(bs, p, bot)
        valid += 1
        if r.get("human_won"):
            wins += 1
        rnd = int(r.get("rounds") or 0)
        sum_rounds += rnd
        sum_d_opp += int(r.get("damage_to_opponent") or 0)
        sum_d_you += int(r.get("damage_to_you") or 0)

    if valid == 0:
        return

    report_lines = _build_report_lines(
        valid, player_level, bot_level, seed, wins, sum_rounds, sum_d_opp, sum_d_you
    )
    report_text = "\n".join(report_lines)
    print(report_text)

    if output_path:
        out = output_path if os.path.isabs(output_path) else os.path.join(project_root, output_path)
        parent = os.path.dirname(out)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(report_text + "\n")
        print(f"\nОтчёт записан: {out}")
