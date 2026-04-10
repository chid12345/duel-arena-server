"""Тиры Battle Pass: награды через reward_calculator."""

from __future__ import annotations

from reward_calculator import calc_reward as _calc_reward


def _build_bp_tiers():
    rows = []
    for battles, wins, diff in [
        (3, 1, "easy"),
        (10, 3, "easy"),
        (25, 8, "medium"),
        (50, 20, "hard"),
        (100, 40, "epic"),
    ]:
        g, d, xp = _calc_reward(diff, "once")
        rows.append((battles, wins, d, g, xp))
    return rows


BP_TIERS = _build_bp_tiers()
