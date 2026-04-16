"""Финализация боя: queue cleanup, persist, статистика, инвалидация кэша.
Вынесено из end_battle_finish.py для соблюдения лимита 200 строк (Закон 1).
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from stats.battle_stats import log_battle as _log_battle_stat

logger = logging.getLogger(__name__)


def cleanup_queue_and_active(bs: Any, battle: Dict[str, Any], battle_id: str,
                             player1: Dict[str, Any], player2: Dict[str, Any]) -> None:
    """Удалить участников из battle_queue + закрыть active_battles."""
    if player1["user_id"] in bs.battle_queue:
        del bs.battle_queue[player1["user_id"]]
    if not battle["is_bot2"] and player2.get("user_id") in bs.battle_queue:
        del bs.battle_queue[player2["user_id"]]
    if battle_id in bs.active_battles:
        del bs.active_battles[battle_id]


def remember_ui(bs: Any, battle: Dict[str, Any], player1: Dict[str, Any],
                player2: Dict[str, Any], result: Dict[str, Any]) -> None:
    """Запомнить result для дозвона UI после рестарта."""
    if battle.get("is_bot2") and player1.get("user_id") is not None:
        bs.remember_battle_end_ui(player1["user_id"], result)
    elif not battle.get("is_bot2"):
        if player1.get("user_id") is not None:
            bs.remember_battle_end_ui(player1["user_id"], result)
        if player2.get("user_id") is not None:
            bs.remember_battle_end_ui(player2["user_id"], result)


def log_stat(loop, *, is_test: bool, battle: Dict[str, Any],
             winner: Dict[str, Any], loser: Dict[str, Any],
             winner_user_id, loser_user_id,
             battle_mode: str, n_rounds: int) -> None:
    """Fire-and-forget статистика для балансировки."""
    if is_test:
        return
    from database import db as _db
    _log_battle_stat(
        loop=loop,
        db=_db,
        mode=battle_mode,
        is_bot2=bool(battle.get("is_bot2")),
        winner_wtype=(winner.get("warrior_type") or "default"),
        loser_wtype=(loser.get("warrior_type") or "default"),
        winner_uid=winner_user_id,
        loser_uid=loser_user_id,
        turns=n_rounds,
    )


def invalidate_tma_cache(winner_user_id, loser_user_id) -> None:
    """Сброс TMA-кэша игроков после persist."""
    try:
        from api.tma_infra import _cache_invalidate
        if winner_user_id is not None:
            _cache_invalidate(int(winner_user_id))
        if loser_user_id is not None:
            _cache_invalidate(int(loser_user_id))
    except Exception:
        pass
