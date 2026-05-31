"""Чистка устаревших записей PvP-очереди (>300 сек)."""
import logging
from database import db

logger = logging.getLogger(__name__)


async def pvp_clear_stale_job(context):
    deleted = db.pvp_clear_stale(older_than_seconds=300)
    if deleted:
        logger.info("pvp_clear_stale: удалено %s устаревших записей", deleted)
