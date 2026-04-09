"""Титан и бесконечный режим после обычного завершения боя."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

from database import db

logger = logging.getLogger(__name__)


async def run_titan_endless_progress(
    loop: Any,
    *,
    is_test: bool,
    battle_mode: str,
    mode_meta: Dict,
    player1: Dict,
    is_winner_p1: bool,
    winner_locked: bool,
    loser_locked: bool,
    winner_stats: Optional[Dict],
) -> Tuple[Optional[Dict], Optional[Dict]]:
    titan_progress = None
    if not is_test and battle_mode == "titan" and player1.get("user_id") is not None:
        floor = max(1, int(mode_meta.get("floor", 1)))
        try:
            if is_winner_p1 and not winner_locked:
                titan_progress = await loop.run_in_executor(None, db.titan_on_win, player1["user_id"], floor)
            elif not is_winner_p1 and not loser_locked:
                titan_progress = await loop.run_in_executor(None, db.titan_on_loss, player1["user_id"], floor)
        except Exception as _te:
            logger.warning("titan_progress error: %s", _te)

    endless_progress = None
    if not is_test and battle_mode == "endless" and player1.get("user_id") is not None:
        wave = max(1, int(mode_meta.get("wave", 1)))
        try:
            if is_winner_p1 and not winner_locked:
                hp_left = int(winner_stats.get("current_hp", 0)) if winner_stats else 0
                max_hp = int(player1.get("max_hp", 100))
                if wave % 5 == 0:
                    heal = max(1, int(max_hp * 0.10))
                    hp_left = min(max_hp, hp_left + heal)
                    if winner_stats is not None:
                        winner_stats["current_hp"] = hp_left
                endless_progress = await loop.run_in_executor(None, db.endless_on_win, player1["user_id"], wave, hp_left)
                try:
                    await loop.run_in_executor(None, db.endless_quest_on_win, player1["user_id"], wave)
                    await loop.run_in_executor(None, db.update_battle_pass_endless, player1["user_id"])
                except Exception as _qe:
                    logger.warning("endless_quest_on_win error: %s", _qe)
            elif not is_winner_p1 and not loser_locked:
                endless_progress = await loop.run_in_executor(None, db.endless_on_loss, player1["user_id"], wave)
        except Exception as _ee:
            logger.warning("endless_progress error: %s", _ee)

    return titan_progress, endless_progress
