"""Команда /reset_prembox — админ сбрасывает флаг сегодняшнего получения премиум-ящика.

Используется для отладки и разовых ручных правок: после старых багов
у админа в БД может быть premium_box_claimed = today без реального получения.
"""

import logging

from telegram import Update
from telegram.ext import ContextTypes

from config import ADMIN_USER_IDS
from database import db
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


class BotHandlersResetPremBox:
    @staticmethod
    async def reset_prembox_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """/reset_prembox [user_id] — сбросить premium_box_claimed.

        Без аргумента — сбрасывает себе. С аргументом — указанному user_id.
        Доступно только админам.
        """
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Только для админов.")
            return

        target_id = user.id
        args = context.args or []
        if args:
            try:
                target_id = int(args[0])
            except (ValueError, TypeError):
                await tg_api_call(update.message.reply_text, "⚠ Неверный user_id.")
                return

        try:
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT premium_box_claimed FROM players WHERE user_id = ?",
                (target_id,),
            )
            row = cur.fetchone()
            before = row["premium_box_claimed"] if row else None

            cur.execute(
                "UPDATE players SET premium_box_claimed = NULL WHERE user_id = ?",
                (target_id,),
            )
            affected = cur.rowcount
            conn.commit()
            conn.close()
        except Exception as exc:
            logger.exception("reset_prembox failed:")
            await tg_api_call(update.message.reply_text, f"❌ Ошибка: {exc}")
            return

        msg = (
            f"✅ premium_box_claimed сброшен для uid={target_id}\n"
            f"Было: {before!r}\n"
            f"Обновлено строк: {affected}\n\n"
            f"Теперь открой магазин/профиль — кнопка «Забрать награду» должна снова гореть."
        )
        await tg_api_call(update.message.reply_text, msg)
        logger.info("reset_prembox: uid=%s by admin=%s (was=%s)", target_id, user.id, before)
