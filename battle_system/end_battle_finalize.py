"""Финализация боя: queue cleanup, persist, статистика, инвалидация кэша.
Вынесено из end_battle_finish.py для соблюдения лимита 200 строк (Закон 1).
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Tuple

from config import STREAK_BONUS_EVERY, STREAK_BONUS_GOLD
from stats.battle_stats import log_battle as _log_battle_stat

logger = logging.getLogger(__name__)


def is_pvp_battle(battle: Dict[str, Any]) -> bool:
    """True для живого PvP И для замаскированного бот-фоллбека (Этап 9).
    Замаскированный фоллбек получает PvP-награды (ELO/серия/+30 бонус),
    т.к. игрок видит «человека» — обман без награды ломает UX."""
    return not battle.get("is_bot2") or bool(battle.get("_disguise_as_pvp"))


def effective_elo_ratings(battle: Dict[str, Any],
                          winner_live: Dict[str, Any], loser_live: Dict[str, Any],
                          winner_user_id, loser_user_id) -> Tuple[int, int]:
    """Рейтинги для ELO-формулы. В замаскированном PvP у бота нет колонки
    rating — используем рейтинг живого игрока с обеих сторон, чтобы выйти
    на равную пару (±16 ELO как в равном PvP)."""
    if not battle.get("_disguise_as_pvp"):
        return int(winner_live.get("rating", 0)), int(loser_live.get("rating", 0))
    if winner_user_id is not None:
        h = int(winner_live.get("rating", 1000))
    else:
        h = int(loser_live.get("rating", 1000))
    return h, h


def compute_player_win_streak(prev_streak: int, is_pvp_win: bool) -> Tuple[int, int]:
    """Серия побед игрока считается ТОЛЬКО за PvP-победы.
    Возврат: (новая серия, бонусное золото за кратность 5).
    PvE-победа не трогает серию и не платит бонус."""
    if not is_pvp_win:
        return prev_streak, 0
    new = prev_streak + 1
    bonus = STREAK_BONUS_GOLD if new % STREAK_BONUS_EVERY == 0 else 0
    return new, bonus


def player_win_streak_after_loss(prev_streak: int, is_pvp_loss: bool) -> int:
    """PvP-поражение сбрасывает серию. PvE-поражение её не трогает."""
    return 0 if is_pvp_loss else prev_streak


def compute_elo_deltas(is_pvp: bool, battle_mode: str,
                       winner_rating: int, loser_rating: int) -> Tuple[int, int]:
    """ELO растёт только в PvP-боях обычного режима. PvE/titan/endless = 0/0."""
    if not is_pvp or battle_mode in ("titan", "endless"):
        return 0, 0
    k = 32
    e_w = 1.0 / (1.0 + 10.0 ** ((loser_rating - winner_rating) / 400.0))
    e_l = 1.0 - e_w
    return max(1, round(k * (1.0 - e_w))), min(-1, round(k * (0.0 - e_l)))


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


def update_bot_win_streak(battle: Dict[str, Any], bot_won: bool) -> None:
    """PvE: бот выиграл — +1 к win_streak; проиграл — сброс. PvP не трогаем."""
    if not battle.get("is_bot2"):
        return
    bot_id = (battle.get("player2") or {}).get("bot_id")
    if not bot_id:
        return
    try:
        from database import db as _db
        if bot_won:
            _db.bot_inc_win_streak(int(bot_id))
        else:
            _db.bot_reset_win_streak(int(bot_id))
    except Exception as e:
        logger.warning("update_bot_win_streak failed bot_id=%s: %s", bot_id, e)
