"""
Одноразовый скрипт: собрать battle_system/ из battle_system.py по диапазонам строк.
Запуск: python tools/extract_battle_package.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "battle_system.py"
OUT = ROOT / "battle_system"

HEADER = '''"""AUTO: фрагмент бывшего battle_system.py — не править руками без сверки с логикой боя."""
from __future__ import annotations

import asyncio
import logging
import random
import time
from html import escape as html_escape
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from config import *
from database import db

from battle_system.models import BattleRound, BattleResult

logger = logging.getLogger(__name__)

'''

# (relpath, ClassName, start_line, end_line) — включительно, 1-based
SEGMENTS: list[tuple[str, str, int, int]] = [
    ("mixins/state.py", "BattleStateMixin", 51, 223),
    ("mixins/start.py", "BattleStartMixin", 225, 301),
    ("mixins/timer.py", "BattleTimerMixin", 303, 422),
    ("mixins/choices.py", "BattleChoicesMixin", 424, 568),
    ("mixins/execute.py", "BattleExecuteMixin", 570, 735),
    ("mixins/execute_afk.py", "BattleExecuteAfkMixin", 736, 835),
    ("mixins/combat_log.py", "BattleCombatLogMixin", 837, 993),
    ("mixins/exchange_text.py", "BattleExchangeMixin", 995, 1091),
    ("mixins/damage.py", "BattleDamageMixin", 1093, 1352),
    ("mixins/end_battle.py", "BattleEndBattleMixin", 1384, 1738),
    ("mixins/persist.py", "BattlePersistMixin", 1740, 1775),
    ("mixins/afk_end.py", "BattleAfkEndMixin", 1777, 1966),
    ("mixins/progression.py", "BattleProgressionMixin", 1968, 2032),
    ("mixins/ui_context.py", "BattleUiContextMixin", 2034, 2110),
]


def main() -> None:
    lines = SRC.read_text(encoding="utf-8").splitlines()
    OUT.mkdir(parents=True, exist_ok=True)
    for rel, cls, a, b in SEGMENTS:
        chunk = lines[a - 1 : b]
        path = OUT / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        body = "\n".join(chunk)
        body = body.replace(
            "return max(0, BattleSystem._safe_int_field(entity, \"crit\", default))",
            "return max(0, self._safe_int_field(entity, \"crit\", default))",
        )
        body = body.replace(
            "p2_damage, o2 = self._calculate_damage_detailed(",
            "p2_damage, o2, _ = self._calculate_damage_detailed(",
        )
        path.write_text(HEADER + f"class {cls}:\n" + body + "\n", encoding="utf-8")
        print("wrote", path, len(chunk), "lines")

    models_lines = lines[19:46]
    (OUT / "models.py").write_text(
        '"""Модели данных боя."""\nfrom __future__ import annotations\n\n'
        + "from dataclasses import dataclass\nfrom typing import List\n\n"
        + "\n".join(models_lines)
        + "\n",
        encoding="utf-8",
    )
    print("wrote models.py")

    mixins_order = [c for _, c, _, _ in SEGMENTS]
    init = f'''"""Система боёв Duel Arena (пакет)."""
from battle_system.models import BattleRound, BattleResult

'''
    for rel, cls, _, _ in SEGMENTS:
        mod = rel.replace("/", ".").replace(".py", "")
        init += f"from battle_system.{mod} import {cls}\n"

    init += f"""
class BattleSystem(
{",\n".join("    " + m for m in mixins_order)},
):
    \"\"\"Управление боями (композиция миксинов).\"\"\"

    pass


battle_system = BattleSystem()

__all__ = ["BattleSystem", "battle_system", "BattleRound", "BattleResult"]
"""
    (OUT / "__init__.py").write_text(init, encoding="utf-8")
    print("wrote __init__.py")


if __name__ == "__main__":
    main()
