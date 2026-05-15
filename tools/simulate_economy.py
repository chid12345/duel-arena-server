#!/usr/bin/env python3
"""
Monte-Carlo симулятор экономики игрока (gold/xp/💎 в день по профилю).

В отличие от tools/simulate_balance.py (только бои) — моделирует ДЕНЬ ИГРОКА:
квесты, ачивки, стрик, бои, башня, премиум, конверсия XP→Gold после cap.

Источник чисел: REWARD_TABLE, LOGIN_STREAK_SETS, ACHIEVEMENT_DEFS,
config/economy.json. Числа НЕ дублируются.

Запуск из корня проекта:
  python tools/simulate_economy.py --profile f2p_endgame --days 30 -n 1000
  python tools/simulate_economy.py --all --days 30 -n 500
  python tools/simulate_economy.py --profile donate -o reports/donate_30d.txt
"""

from __future__ import annotations

import os
import sys

# Принудительно UTF-8 для stdout (Windows консоль по умолчанию cp1251).
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from economy_simulation.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
