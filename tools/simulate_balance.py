#!/usr/bin/env python3
"""
Монте-Карло симуляция боёв «игрок vs бот» для оценки баланса (без Telegram).

Запуск из корня проекта:
  python tools/simulate_balance.py -n 500
  python tools/simulate_balance.py -n 1000 --player-level 10 --bot-level 12 --seed 42
  python tools/simulate_balance.py -n 2000 -o reports/balance_01.txt
"""

from __future__ import annotations

import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from balance_simulation.cli import main

if __name__ == "__main__":
    main()
