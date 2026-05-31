"""Push: напоминание о ежедневном бонусе (12:00)."""
import logging
from config import DATABASE_URL
from database import db

logger = logging.getLogger(__name__)


async def daily_bonus_reminder(context):
    """Шлём всем у кого есть chat_id и кто не заходил 20+ часов."""
    conn = db.get_connection()
    cursor = conn.cursor()
    if DATABASE_URL:
        stale = "last_active < (NOW() - INTERVAL '20 hours')"
    else:
        stale = "last_active < datetime('now', '-20 hours')"
    cursor.execute(
        f"""SELECT user_id, chat_id FROM players
           WHERE chat_id IS NOT NULL
             AND {stale}
           LIMIT 1000"""
    )
    rows = cursor.fetchall()
    conn.close()
    for row in rows:
        try:
            await context.bot.send_message(
                chat_id=row['chat_id'],
                text="🎁 Не забудь забрать ежедневный бонус! Открой /start",
            )
        except Exception:
            pass
