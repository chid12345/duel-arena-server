"""Финализация клан-войн: раз в 10 минут закрывает войны
с истёкшим ends_at и выдаёт награды победителю.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


async def clan_wars_finalize_job(context) -> None:  # noqa: ARG001
    from database import db
    try:
        n = db.end_finished_wars()
        if n:
            logger.info("clan_wars_finalize: закрыто %s войн", n)
    except Exception as e:
        logger.warning("clan_wars_finalize: ошибка: %s", e)
