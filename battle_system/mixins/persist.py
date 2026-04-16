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
        """Запись результатов боя в БД.

        ВАЖНО: update_player_stats ДОЛЖЕН выполниться ДО остальных задач,
        иначе параллельный quest/BP может прочитать стейл-данные.
        """
        import asyncio
        loop = asyncio.get_event_loop()
        event_name = 'battle_test_ended' if is_test else 'battle_ended'

        _is_bot_battle = bool(battle_data.get("is_bot2"))

        # ── Фаза 1: записать статы игроков (ОБЯЗАТЕЛЬНО до всего остального) ──
        if not is_test:
            critical = []
            if winner_uid is not None and winner_stats is not None:
                logger.info(
                    "persist_stats winner uid=%s hp=%s/%s exp=%s gold=%s",
                    winner_uid,
                    winner_stats.get("current_hp"),
                    winner_stats.get("max_hp"),
                    winner_stats.get("exp"),
                    winner_stats.get("gold"),
                )
                critical.append(loop.run_in_executor(
                    None, db.update_player_stats, winner_uid, winner_stats))
            if loser_uid is not None and loser_stats is not None:
                logger.info(
                    "persist_stats loser uid=%s hp=%s/%s",
                    loser_uid,
                    loser_stats.get("current_hp"),
                    loser_stats.get("max_hp"),
                )
                critical.append(loop.run_in_executor(
                    None, db.update_player_stats, loser_uid, loser_stats))
            if critical:
                crit_results = await asyncio.gather(*critical, return_exceptions=True)
                for i, r in enumerate(crit_results):
                    if isinstance(r, Exception):
                        logger.error("CRITICAL persist_stats FAIL [%d]: %s", i, r, exc_info=r)

        # ── Фаза 2: побочные записи (квесты, BP, сезон) — параллельно ──
        side = []
        if not is_test:
            if winner_uid is not None and winner_stats is not None:
                side.append(loop.run_in_executor(None, db.update_daily_quest_progress, winner_uid, True, _is_bot_battle))
                if battle_mode != "titan":
                    side.append(loop.run_in_executor(None, db.update_season_stats, winner_uid, True))
                side.append(loop.run_in_executor(None, db.update_battle_pass, winner_uid, True))
            if loser_uid is not None and loser_stats is not None:
                side.append(loop.run_in_executor(None, db.update_daily_quest_progress, loser_uid, False, False))
                if battle_mode != "titan":
                    side.append(loop.run_in_executor(None, db.update_season_stats, loser_uid, False))
                side.append(loop.run_in_executor(None, db.update_battle_pass, loser_uid, False))
            if not (winner_locked or loser_locked):
                side.append(loop.run_in_executor(None, db.save_battle, battle_data))

        side.append(loop.run_in_executor(None, db.log_metric_event, event_name, winner_id, n_rounds, duration_ms))

        results = await asyncio.gather(*side, return_exceptions=True)
        for r in results:
            if isinstance(r, Exception):
                logger.error("battle_persist side error: %s", r)
