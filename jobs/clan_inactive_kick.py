"""Авто-кик неактивных участников клана.

Раз в сутки удаляет участников, у которых last_active_at старше 30 дней.
Лидера никогда не трогает. Запись пишется в clan_history (тип 'autokick').
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

INACTIVE_DAYS = 30


async def clan_inactive_kick_job(context) -> None:  # noqa: ARG001
    from database import db
    try:
        kicked = _kick_once(db, days=INACTIVE_DAYS)
    except Exception as e:
        logger.warning("clan_inactive_kick: ошибка: %s", e)
        return
    if kicked:
        logger.info("clan_inactive_kick: удалено %s неактивных участников", kicked)


def _kick_once(db, *, days: int) -> int:
    conn = db.get_connection()
    cursor = conn.cursor()
    try:
        if db._pg:
            cursor.execute(
                "SELECT cm.user_id, cm.clan_id FROM clan_members cm "
                "JOIN clans c ON c.id = cm.clan_id "
                "WHERE cm.user_id <> c.leader_id "
                "AND cm.last_active_at < (CURRENT_TIMESTAMP - (%s || ' days')::interval)",
                (str(days),),
            )
        else:
            cursor.execute(
                "SELECT cm.user_id, cm.clan_id FROM clan_members cm "
                "JOIN clans c ON c.id = cm.clan_id "
                "WHERE cm.user_id <> c.leader_id "
                "AND cm.last_active_at < datetime('now', ?)",
                (f"-{int(days)} days",),
            )
        rows = [(int(r["user_id"]), int(r["clan_id"])) for r in cursor.fetchall()]
        if not rows:
            return 0
        for uid, clan_id in rows:
            cursor.execute("DELETE FROM clan_members WHERE user_id = ?", (uid,))
            cursor.execute("UPDATE players SET clan_id = NULL WHERE user_id = ?", (uid,))
            try:
                cursor.execute(
                    "INSERT INTO clan_history (clan_id, event_type, actor_id, actor_name, extra) "
                    "VALUES (?, 'autokick', ?, ?, ?)",
                    (clan_id, uid, "", f"{days}d inactive"),
                )
            except Exception:
                pass
        conn.commit()
        return len(rows)
    finally:
        conn.close()
