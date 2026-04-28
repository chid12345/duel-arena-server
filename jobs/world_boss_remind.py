"""Индивидуальный пуш подписчикам за 5 мин до рейда Мирового босса.

Запускается раз в 60 сек. Если scheduled_at попадает в окно [now, now+5min]
и пуши ещё не слали (reminders_sent_5min=0) — атомарно ставит флаг и шлёт
пуши всем игрокам с wb_reminder_opt_in=1. Ошибки отдельных чатов не ломают
остальные — просто логируются.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from config import WEBAPP_PUBLIC_URL
from config.world_boss_constants import WB_ANNOUNCE_LEAD_SEC

logger = logging.getLogger(__name__)


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _build_markup() -> InlineKeyboardMarkup | None:
    if not WEBAPP_PUBLIC_URL:
        return None
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("⚔️ В бой", url=WEBAPP_PUBLIC_URL),
    ]])


async def world_boss_reminder_push_job(context) -> None:
    """Шлёт индивидуальные пуши подписчикам за 5 мин до рейда (идемпотентно)."""
    from database import db
    try:
        nxt = db.get_wb_next_scheduled()
        if not nxt:
            return
        try:
            sched_at = _parse_ts(nxt["scheduled_at"])
        except Exception as e:
            logger.warning("wb_remind: bad scheduled_at=%r: %s",
                           nxt.get("scheduled_at"), e)
            return

        now = datetime.now(timezone.utc)
        seconds_left = (sched_at - now).total_seconds()
        if seconds_left <= 0 or seconds_left > WB_ANNOUNCE_LEAD_SEC:
            return

        spawn_id = int(nxt["spawn_id"])
        if not db.wb_try_mark_reminders_sent_5min(spawn_id):
            return

        subs = db.get_wb_reminder_users()
        if not subs:
            logger.warning("wb_remind: нет подписчиков для рейда id=%s (никто не включил уведомления или нет chat_id)", spawn_id)
            return

        boss_name = nxt.get("boss_name") or "Титан"
        minutes = max(1, int(round(seconds_left / 60)))
        text = (
            f"🔔 Рейд начнётся через <b>{minutes} мин</b>!\n\n"
            f"🐉 Босс: <b>{boss_name}</b>\n"
            f"Готовь свитки и занимай позицию ⚔️"
        )
        markup = _build_markup()

        sent = 0
        failed = 0
        for uid, chat_id in subs:
            try:
                await context.bot.send_message(
                    chat_id=chat_id,
                    text=text,
                    parse_mode="HTML",
                    reply_markup=markup,
                )
                sent += 1
            except Exception as e:
                failed += 1
                logger.debug("wb_remind: ошибка пуша uid=%s chat=%s: %s",
                             uid, chat_id, e)

        reset_cnt = db.reset_wb_reminder_opt_in()
        logger.info(
            "wb_remind: рейд id=%s ('%s') — отправлено %d, ошибок %d, сброшено opt-in %d",
            spawn_id, boss_name, sent, failed, reset_cnt,
        )
    except Exception as e:
        logger.warning("wb_remind: ошибка тика: %s", e)
