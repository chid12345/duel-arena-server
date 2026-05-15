"""
tests/test_economy_xp.py — формулы XP.

Покрывает:
- xp_per_win растёт по уровню,
- xp_per_loss = доля от победы,
- xp_to_next растёт piecewise,
- xp_for_task по таблице,
- apply_premium_xp +25%.

Чистые функции — БД не нужна.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from economy.xp_formulas import (  # noqa: E402
    xp_per_win,
    xp_per_loss,
    xp_to_next,
    xp_for_task,
    apply_premium_xp,
)


def test_xp_per_win_grows_with_level():
    """XP за победу должен расти от уровня (формула с power)."""
    assert xp_per_win(80) > xp_per_win(1), "На lv80 XP за победу должен быть больше чем на lv1"
    assert xp_per_win(50) > xp_per_win(20), "Монотонный рост"


def test_xp_per_loss_is_fraction_of_win():
    """XP за поражение — доля от победы (XP_DEFEAT_FRACTION = 0.10)."""
    win = xp_per_win(50)
    loss = xp_per_loss(50)
    assert loss < win, f"XP за loss ({loss}) должен быть меньше win ({win})"
    assert loss == int(win * 0.10), f"loss должен быть ровно 10% от win"


def test_xp_to_next_grows_with_level():
    """xp_to_next(50) > xp_to_next(40) — больше уровень, больше нужно опыта."""
    assert xp_to_next(50) > xp_to_next(40), "xp_to_next должен расти"
    # И break1 (lv30) добавляет бонус → xp_to_next(40) > xp_to_next(20) + лин-разница
    assert xp_to_next(40) > xp_to_next(20), "После break1 рост ускоряется"


def test_xp_for_task_grows_with_difficulty():
    """epic квест даёт больше XP чем easy."""
    assert xp_for_task("epic", "weekly") > xp_for_task("easy", "weekly"), (
        "epic должен давать больше XP"
    )
    assert xp_for_task("hard", "daily") > xp_for_task("medium", "daily"), (
        "hard > medium"
    )


def test_apply_premium_xp_uses_buff():
    """Премиум +25% к XP: 100 → 125."""
    assert apply_premium_xp(100) == 125, f"Ожидали 125, получили {apply_premium_xp(100)}"
