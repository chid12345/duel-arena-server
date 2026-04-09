"""AUTO: фрагмент бывшего battle_system.py — не править руками без сверки с логикой боя."""
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

class BattlePersistMixin:
    async def _persist_battle_writes(
        self,
        winner_uid: Optional[int], loser_uid: Optional[int],
        winner_stats: Optional[dict], loser_stats: Optional[dict],
        winner_locked: bool, loser_locked: bool,
        battle_data: dict, battle_mode: str, is_test: bool,
        winner_id: int, n_rounds: int, duration_ms: int,
    ) -> None:
        """Фоновая запись результатов боя в БД (параллельно)."""
        import asyncio
        loop = asyncio.get_event_loop()
        tasks = []
        event_name = 'battle_test_ended' if is_test else 'battle_ended'

        if not is_test:
            if winner_uid is not None and winner_stats is not None:
                tasks.append(loop.run_in_executor(None, db.update_player_stats, winner_uid, winner_stats))
                tasks.append(loop.run_in_executor(None, db.update_daily_quest_progress, winner_uid, True))
                if battle_mode != "titan":
                    tasks.append(loop.run_in_executor(None, db.update_season_stats, winner_uid, True))
                tasks.append(loop.run_in_executor(None, db.update_battle_pass, winner_uid, True))
            if loser_uid is not None and loser_stats is not None:
                tasks.append(loop.run_in_executor(None, db.update_player_stats, loser_uid, loser_stats))
                tasks.append(loop.run_in_executor(None, db.update_daily_quest_progress, loser_uid, False))
                if battle_mode != "titan":
                    tasks.append(loop.run_in_executor(None, db.update_season_stats, loser_uid, False))
                tasks.append(loop.run_in_executor(None, db.update_battle_pass, loser_uid, False))
            if not (winner_locked or loser_locked):
                tasks.append(loop.run_in_executor(None, db.save_battle, battle_data))

        tasks.append(loop.run_in_executor(None, db.log_metric_event, event_name, winner_id, n_rounds, duration_ms))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, Exception):
                logger.error("battle_persist error: %s", r)
