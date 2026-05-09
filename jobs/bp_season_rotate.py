"""Ротация сезона батл-пасса (Шаг 5).

Раз в час:
1. Если активный bp_season имеет ends_at < now → закрываем (is_active=false).
2. Если активного bp_season нет → создаём новый из config/season_pass.json.

Логика конца сезона: пока минимальная — просто переключение флага.
В будущем здесь же может быть выдача топ-наград, конверсия очков, и т.п.
"""

from __future__ import annotations

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def _now_utc() -> datetime:
    return datetime.utcnow()


async def bp_season_rotate_job(context) -> None:  # noqa: ARG001
    """JobQueue task: проверить и закрыть просроченный сезон."""
    from database import db
    try:
        active = db.get_active_bp_season()
        if active is not None:
            ends_at = active.get("ends_at")
            if ends_at:
                # ends_at может быть datetime или ISO-строка — нормализуем
                if isinstance(ends_at, str):
                    try:
                        ends_dt = datetime.fromisoformat(ends_at.replace("Z", ""))
                    except Exception:
                        ends_dt = None
                else:
                    ends_dt = ends_at
                if ends_dt and ends_dt < _now_utc():
                    _close_season(db, int(active["id"]))
                    logger.info("bp_season_rotate: закрыт сезон id=%s", active["id"])
        # Если активного нет — создать новый из конфига
        new_season = db.ensure_bp_season()
        if new_season and (active is None or int(new_season["id"]) != int(active["id"])):
            logger.info("bp_season_rotate: новый сезон id=%s name=%r",
                        new_season["id"], new_season.get("name"))
    except Exception as e:
        logger.warning("bp_season_rotate: ошибка: %s", e)


def _close_season(db, season_id: int) -> None:
    """Помечает сезон is_active=false."""
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        false_val = False if db._pg else 0
        ph = "%s" if db._pg else "?"
        cursor.execute(
            f"UPDATE bp_seasons SET is_active = {ph} WHERE id = {ph}",
            (false_val, int(season_id)),
        )
        conn.commit()
    finally:
        conn.close()
