"""Ротация сезона батл-пасса (Шаг 5).

Раз в час:
1. Если активный bp_season имеет ends_at < now → выдаём топ-награды и
   закрываем (is_active=false).
2. Если активного bp_season нет → создаём новый из config/season_pass.json.

Топ-награды конца сезона (используют существующий контент игры):
- Топ-1 по BP-очкам: +100 💎 + box_rare (50💎-ящик из магазина)
- Топ-2: +60 💎 + box_common
- Топ-3: +40 💎 + box_common
- 4-10: +20 💎
- 11-50: +10 💎
"""

from __future__ import annotations

import logging
from datetime import datetime

logger = logging.getLogger(__name__)


# Награды по местам в финальном топе сезона.
# Ключ — место (1-based), значение — (diamonds, item_id или None).
SEASON_TOP_REWARDS = [
    # (range_start, range_end, diamonds, item_id)
    (1, 1,   100, "box_rare"),
    (2, 2,    60, "box_common"),
    (3, 3,    40, "box_common"),
    (4, 10,   20, None),
    (11, 50,  10, None),
]


def _reward_for_rank(rank: int) -> tuple[int, str | None]:
    for start, end, diamonds, item in SEASON_TOP_REWARDS:
        if start <= rank <= end:
            return diamonds, item
    return 0, None


def _now_utc() -> datetime:
    return datetime.utcnow()


async def bp_season_rotate_job(context) -> None:  # noqa: ARG001
    """JobQueue task: проверить и закрыть просроченный сезон, выдать топ-награды."""
    from database import db
    try:
        active = db.get_active_bp_season()
        if active is not None:
            ends_at = active.get("ends_at")
            if ends_at:
                if isinstance(ends_at, str):
                    try:
                        ends_dt = datetime.fromisoformat(ends_at.replace("Z", ""))
                    except Exception:
                        ends_dt = None
                else:
                    ends_dt = ends_at
                if ends_dt and ends_dt < _now_utc():
                    rewarded = _award_season_top(db, int(active["id"]))
                    _close_season(db, int(active["id"]))
                    logger.info(
                        "bp_season_rotate: закрыт сезон id=%s, награждено топ-%s игроков",
                        active["id"], rewarded,
                    )
        # Если активного нет — создать новый из конфига
        new_season = db.ensure_bp_season()
        if new_season and (active is None or int(new_season["id"]) != int(active["id"])):
            logger.info("bp_season_rotate: новый сезон id=%s name=%r",
                        new_season["id"], new_season.get("name"))
    except Exception as e:
        logger.warning("bp_season_rotate: ошибка: %s", e)


def _award_season_top(db, season_id: int) -> int:
    """Выдать топ-награды (алмазы + ящик) лучшим игрокам сезона.
    Возвращает число награждённых игроков."""
    conn = db.get_connection()
    cursor = conn.cursor()
    awarded = 0
    try:
        ph = "%s" if db._pg else "?"
        cursor.execute(
            f"SELECT user_id, points FROM bp_progress "
            f"WHERE season_id = {ph} AND points > 0 "
            f"ORDER BY points DESC LIMIT 50",
            (int(season_id),),
        )
        rows = cursor.fetchall()
        for rank, row in enumerate(rows, start=1):
            uid = int(row["user_id"])
            diamonds, item = _reward_for_rank(rank)
            if diamonds <= 0 and not item:
                continue
            try:
                if diamonds > 0:
                    cursor.execute(
                        f"UPDATE players SET diamonds = diamonds + {ph} WHERE user_id = {ph}",
                        (int(diamonds), uid),
                    )
                if item:
                    cursor.execute(
                        f"INSERT INTO user_inventory (user_id, item_name, quantity) "
                        f"VALUES ({ph}, {ph}, 1)",
                        (uid, item),
                    )
                awarded += 1
            except Exception as e:
                logger.warning("season_top reward uid=%s rank=%s failed: %s", uid, rank, e)
        conn.commit()
    finally:
        conn.close()
    return awarded


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
