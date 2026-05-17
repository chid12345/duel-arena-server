"""Админ-команда /debug_rentals — диагностика equipment_rentals в БД.

Создана 2026-05-18 для разбора бага: игрок арендовал mythic-броню,
но в каталоге UI продолжает гореть «Купить» (active_rentals в /api/player
возвращает пусто). Команда показывает сырые данные таблицы.

После решения проблемы — удалить (или закрыть admin-only гейтом).
"""

import json
import logging

from telegram import Update
from telegram.ext import ContextTypes

from config import ADMIN_USER_IDS
from database import db
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


def _is_admin(user_id: int) -> bool:
    return user_id in ADMIN_USER_IDS


class BotHandlersDebugRentals:

    @staticmethod
    async def debug_rentals_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """/debug_rentals — показывает состояние equipment_rentals для вызывающего."""
        user = update.effective_user
        if not _is_admin(user.id):
            await tg_api_call(
                update.message.reply_text,
                "🚫 Команда только для администраторов.",
            )
            return
        uid = int(user.id)
        try:
            api_rentals = db.list_active_rentals(uid)

            # Используем cursor (а не conn.execute) — иначе в Postgres
            # ? не преобразуется в %s и получаем ProgrammingError.
            conn = db.get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "SELECT user_id, item_id, expires_at, rented_at, stars_paid "
                    "FROM equipment_rentals WHERE user_id = ?",
                    (uid,),
                )
                rows = cur.fetchall()
                raw_rows = [dict(r) for r in rows]
            finally:
                conn.close()

            conn = db.get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "SELECT slot, item_id FROM player_equipment WHERE user_id = ?",
                    (uid,),
                )
                rows = cur.fetchall()
                equipment_rows = [dict(r) for r in rows]
            finally:
                conn.close()

            try:
                eq = db.get_equipment(uid)
                eq_repr = {s: it.get("item_id") for s, it in eq.items()}
            except Exception as e:
                eq_repr = {"error": str(e)}

            from datetime import datetime
            payload = {
                "uid": uid,
                "now_utc": datetime.utcnow().isoformat(),
                "api_active_rentals_count": len(api_rentals),
                "api_active_rentals": api_rentals,
                "raw_equipment_rentals_count": len(raw_rows),
                "raw_equipment_rentals": raw_rows,
                "player_equipment_rows": equipment_rows,
                "get_equipment_result": eq_repr,
            }
            text = "🔬 DEBUG RENTALS\n```\n" + json.dumps(payload, indent=2, default=str, ensure_ascii=False) + "\n```"

            if len(text) > 3800:
                text = text[:3800] + "\n...(обрезано)```"

            await tg_api_call(update.message.reply_text, text, parse_mode="Markdown")
        except Exception as e:
            logger.exception("debug_rentals error uid=%s: %s", uid, e)
            await tg_api_call(update.message.reply_text, f"❌ Ошибка: {type(e).__name__}: {e}")
