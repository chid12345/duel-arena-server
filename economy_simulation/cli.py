"""CLI парсер для tools/simulate_economy.py."""

from __future__ import annotations

import argparse
import os
import sys

from economy_simulation.profiles import list_profiles
from economy_simulation.report import run_monte_carlo, format_report


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="simulate_economy",
        description="Monte-Carlo симулятор экономики (gold/xp/💎 в день по профилям).",
    )
    p.add_argument("--profile", "-p", choices=list_profiles(), default="f2p_mid",
                   help="Профиль игрока (default: f2p_mid).")
    p.add_argument("--days", "-d", type=int, default=30,
                   help="Длительность симуляции в днях (default: 30).")
    p.add_argument("-n", "--runs", type=int, default=500,
                   help="Количество прогонов Monte-Carlo (default: 500).")
    p.add_argument("--seed", type=int, default=None,
                   help="Seed RNG (для воспроизводимости).")
    p.add_argument("-o", "--output", type=str, default=None,
                   help="Файл для сохранения отчёта (по умолчанию — stdout).")
    p.add_argument("--all", action="store_true",
                   help="Прогнать ВСЕ профили подряд и выдать сводный отчёт.")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv if argv is not None else sys.argv[1:])
    cmd = "python tools/simulate_economy.py " + " ".join(sys.argv[1:])

    if args.all:
        sections = []
        for prof_key in list_profiles():
            result = run_monte_carlo(prof_key, args.days, args.runs, args.seed)
            sections.append(format_report(result, cmd))
        report = ("\n\n" + "─" * 60 + "\n\n").join(sections)
    else:
        result = run_monte_carlo(args.profile, args.days, args.runs, args.seed)
        report = format_report(result, cmd)

    if args.output:
        out_path = args.output
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(report)
        print(report)
        print(f"\nОтчёт записан: {out_path}")
    else:
        print(report)
    return 0
