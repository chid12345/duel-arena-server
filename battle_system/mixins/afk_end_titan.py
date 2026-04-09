"""Титан при завершении боя по AFK."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from database import db

logger = logging.getLogger(__name__)


async def run_titan_progress_afk(
    loop: Any,
    *,
    is_test: bool,
    battle_mode: str,
    mode_meta: Dict,
    player1: Dict,
    winner_id: int,
    winner_locked: bool,
    loser_locked: bool,
) -> Optional[Dict]:
    if is_test or battle_mode != "titan" or player1.get("user_id") is None:
        return None
    floor = max(1, int(mode_meta.get("floor", 1)))
    try:
        if winner_id == player1["user_id"] and not winner_locked:
            return await loop.run_in_executor(None, db.titan_on_win, player1["user_id"], floor)
        if winner_id != player1["user_id"] and not loser_locked:
            return await loop.run_in_executor(None, db.titan_on_loss, player1["user_id"], floor)
    except Exception as _te:
        logger.warning("titan_progress afk error: %s", _te)
    return None
