"""Авто-healing кланов: передача лидерства / роспуск мёртвых.

Раз в сутки проходит по всем кланам. Для каждого вызывает
heal_clan_leadership: если лидер пропал — передаёт старшему участнику,
если членов нет — удаляет клан полностью (_purge_clan_rows).

Дополняет lazy-heal в GET /api/clan: клан, в который никто не заходит
(все игроки сбросили профили), теперь тоже вычищается.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


async def clan_heal_job(context) -> None:  # noqa: ARG001
    from database import db
    try:
        stats = _heal_once(db)
    except Exception as e:
        logger.warning("clan_heal: ошибка: %s", e)
        return
    if stats["transferred"] or stats["disbanded"]:
        logger.info(
            "clan_heal: передано лидерств=%s, распущено кланов=%s (проверено %s)",
            stats["transferred"], stats["disbanded"], stats["checked"],
        )


def _heal_once(db) -> dict:
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM clans")
        clan_ids = [int(r["id"]) for r in cursor.fetchall()]
    finally:
        conn.close()

    checked = transferred = disbanded = 0
    for clan_id in clan_ids:
        checked += 1
        try:
            res = db.heal_clan_leadership(clan_id)
        except Exception as e:
            logger.warning("clan_heal: clan_id=%s ошибка: %s", clan_id, e)
            continue
        if not res.get("healed"):
            continue
        if res.get("disbanded"):
            disbanded += 1
        elif res.get("new_leader_id"):
            transferred += 1
    return {"checked": checked, "transferred": transferred, "disbanded": disbanded}
