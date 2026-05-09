"""
Хелперы для начисления BP-очков из триггеров (бои, квесты, рейды).

Функции тонкие: ловят все исключения и логируют — не должны ронять основной
поток (бой, выдача награды и т.п.) если сезон-пасс почему-то недоступен.
"""

from __future__ import annotations

import logging
from typing import Any

from repositories.season_pass.config_loader import get_points_for_action

logger = logging.getLogger(__name__)


def _safe_award(db: Any, user_id: int, action: str) -> None:
    """Начислить BP-очки за конкретное действие. Тихо игнорирует ошибки."""
    if user_id is None or user_id == 0:
        return
    try:
        pts = get_points_for_action(action)
        if pts <= 0:
            return
        db.add_bp_points(int(user_id), pts)
    except Exception as e:
        logger.warning("bp_award failed action=%s uid=%s: %s", action, user_id, e)


def award_battle_win(db: Any, winner_user_id: int, vs_bot: bool) -> None:
    """После победы в бою: pvp_win если против игрока, pve_bot_win если против бота."""
    _safe_award(db, winner_user_id, "pve_bot_win" if vs_bot else "pvp_win")


def award_battle_loss(db: Any, loser_user_id: int) -> None:
    """После поражения PvP — небольшое количество очков (заметность активности)."""
    _safe_award(db, loser_user_id, "pvp_loss")


def award_quest_complete(db: Any, user_id: int, frequency: str) -> None:
    """После забора награды за квест."""
    action_map = {
        "daily": "daily_quest",
        "weekly": "weekly_quest",
        "once": "achievement",
    }
    action = action_map.get(frequency, "daily_quest")
    _safe_award(db, user_id, action)


def award_wb_hit(db: Any, user_id: int) -> None:
    """За каждый удар по мировому боссу (на старте рейда / в течение)."""
    _safe_award(db, user_id, "wb_hit")


def award_wb_top_damage(db: Any, user_id: int) -> None:
    """Top-1 урона по WB в окончании рейда."""
    _safe_award(db, user_id, "wb_top_damage")


def award_wb_last_hit(db: Any, user_id: int) -> None:
    _safe_award(db, user_id, "wb_last_hit")


def award_tower_floor(db: Any, user_id: int, floor: int) -> None:
    """За каждый этаж Башни Титанов: 1 этаж = points_for_action.tower_floor."""
    if floor <= 0:
        return
    pts_per = get_points_for_action("tower_floor")
    if pts_per <= 0:
        return
    try:
        db.add_bp_points(int(user_id), int(pts_per * floor))
    except Exception as e:
        logger.warning("bp_award tower_floor failed uid=%s floor=%s: %s", user_id, floor, e)


def award_endless_wave(db: Any, user_id: int, wave: int) -> None:
    if wave <= 0:
        return
    pts_per = get_points_for_action("endless_wave")
    if pts_per <= 0:
        return
    try:
        db.add_bp_points(int(user_id), int(pts_per * wave))
    except Exception as e:
        logger.warning("bp_award endless_wave failed uid=%s wave=%s: %s", user_id, wave, e)
