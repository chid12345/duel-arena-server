"""Анонс рейда Мирового босса в общий чат за 5 мин до спавна.

Запускается раз в 60 сек. Если scheduled_at попадает в окно [now, now+5min]
и ещё не анонсирован (announced_5min=0) — отправляет сообщение в WB_ANNOUNCE_CHAT_ID
с URL-кнопкой на Mini App. Атомарная отметка предотвращает дубль при повторных тиках.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from config import WB_ANNOUNCE_CHAT_ID, WEBAPP_PUBLIC_URL
from config.world_boss_constants import WB_ANNOUNCE_LEAD_SEC

logger = logging.getLogger(__name__)


def _parse_ts(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value).replace("T", " ").split(".")[0]
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _build_markup() -> InlineKeyboardMarkup | None:
    """URL-кнопка на Mini App (работает в групповых чатах, в отличие от WebApp-кнопки)."""
    if not WEBAPP_PUBLIC_URL:
        return None
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("⚔️ В бой", url=WEBAPP_PUBLIC_URL),
    ]])


async def world_boss_announce_5min_job(context) -> None:
    """Отправляет анонс за 5 мин до старта рейда (идемпотентно)."""
    if not WB_ANNOUNCE_CHAT_ID:
        return
    from database import db
    try:
        nxt = db.get_wb_next_scheduled()
        if not nxt:
            return
        try:
            sched_at = _parse_ts(nxt["scheduled_at"])
        except Exception as e:
            logger.warning("wb_announce: bad scheduled_at=%r: %s",
                           nxt.get("scheduled_at"), e)
            return

        now = datetime.now(timezone.utc)
        seconds_left = (sched_at - now).total_seconds()
        # Окно [0, LEAD_SEC]: рейд ещё не начался и ждать ≤ 5 мин.
        if seconds_left <= 0 or seconds_left > WB_ANNOUNCE_LEAD_SEC:
            return

        spawn_id = int(nxt["spawn_id"])
        if not db.wb_try_mark_announced_5min(spawn_id):
            return  # Уже анонсировали (другой тик успел).

        boss_name = nxt.get("boss_name") or "Титан"
        minutes = max(1, int(round(seconds_left / 60)))
        text = (
            f"🐉 <b>{boss_name}</b> появится через <b>{minutes} мин</b>!\n\n"
            f"Рейд длится 10 минут — объединитесь всей ареной и выбейте из него сундуки 🎁\n"
            f"Уязвимости x3 открываются каждую минуту на 5 секунд — не зевайте!"
        )

        try:
            await context.bot.send_message(
                chat_id=WB_ANNOUNCE_CHAT_ID,
                text=text,
                parse_mode="HTML",
                reply_markup=_build_markup(),
                disable_notification=False,
            )
            logger.info(
                "wb_announce: отправлен анонс рейда id=%s ('%s') в чат %s за %d сек до старта",
                spawn_id, boss_name, WB_ANNOUNCE_CHAT_ID, int(seconds_left),
            )
        except Exception as e:
            logger.warning(
                "wb_announce: не удалось отправить анонс в чат %s: %s",
                WB_ANNOUNCE_CHAT_ID, e,
            )
    except Exception as e:
        logger.warning("wb_announce: ошибка тика: %s", e)
