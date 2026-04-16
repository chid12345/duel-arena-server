"""Scheduled job: push-уведомление когда HP полностью восстановлен."""

from __future__ import annotations

import logging

from database import db

logger = logging.getLogger(__name__)


async def hp_full_notify_job(context) -> None:
    """Проверяет игроков с hp_full_notified=0 и шлёт Telegram push если HP уже полный."""
    pending = db.get_players_hp_notify_pending(limit=200)
    if not pending:
        return

    ready_ids: list[int] = []
    for p in pending:
        if db.is_hp_full_now(p):
            ready_ids.append(p["user_id"])

    if not ready_ids:
        return

    db.mark_hp_full_notified(ready_ids)

    sent = 0
    for p in pending:
        if p["user_id"] not in ready_ids:
            continue
        chat_id = p.get("chat_id")
        if not chat_id:
            continue
        try:
            await context.bot.send_message(
                chat_id=chat_id,
                text="❤️‍🔥 HP полностью восстановлен! Время для боя ⚔️\n"
                     "Открой /start или Mini App",
            )
            sent += 1
        except Exception:
            pass

    if sent:
        logger.info("hp_full_notify: отправлено %d push", sent)
