"""CLI: python tools/simulate_balance.py из корня репозитория."""

from __future__ import annotations

import argparse
import asyncio
import os

from config import MAX_LEVEL

from balance_simulation.report import run_monte_carlo


def main() -> None:
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    ap = argparse.ArgumentParser(description="Симуляция баланса: игрок vs бот (случайные ходы).")
    ap.add_argument("-n", "--battles", type=int, default=500, help="Число боёв (по умолчанию 500)")
    ap.add_argument("--player-level", type=int, default=5, help="Уровень синтетического игрока")
    ap.add_argument(
        "--bot-level",
        type=int,
        default=None,
        help="Центр подбора бота (по умолчанию = уровень игрока)",
    )
    ap.add_argument("--seed", type=int, default=None, help="Seed RNG для воспроизводимости")
    ap.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        metavar="FILE",
        help="Сохранить отчёт в файл (UTF-8); путь относительно корня проекта, если не абсолютный",
    )
    args = ap.parse_args()

    if args.battles < 1:
        ap.error("Число боёв должно быть >= 1")
    if not (1 <= args.player_level <= MAX_LEVEL):
        ap.error(f"Уровень игрока 1..{MAX_LEVEL}")
    if args.bot_level is not None and not (1 <= args.bot_level <= MAX_LEVEL):
        ap.error(f"Уровень бота 1..{MAX_LEVEL}")

    asyncio.run(
        run_monte_carlo(
            n=args.battles,
            player_level=args.player_level,
            bot_level=args.bot_level,
            seed=args.seed,
            output_path=args.output,
            project_root=project_root,
        )
    )


if __name__ == "__main__":
    main()
