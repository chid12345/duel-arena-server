"""Ротация сезона клана: раз в час проверяет, не пора ли закрыть сезон
и выдать награды. Если активного сезона нет — создаёт новый.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


async def clan_season_rotate_job(context) -> None:  # noqa: ARG001
    from database import db
    try:
        # Гарантируем активный сезон (создаст если нет)
        db.ensure_active_season()
        # Попытка закрыть просроченный
        res = db.end_season_and_reward()
        if res.get("ok") and res.get("rewarded", 0) > 0:
            logger.info(
                "clan_season_rotate: закрыт сезон, награждено %s игроков, новый сезон id=%s",
                res.get("rewarded"), res.get("new_season_id"),
            )
    except Exception as e:
        logger.warning("clan_season_rotate: ошибка: %s", e)
