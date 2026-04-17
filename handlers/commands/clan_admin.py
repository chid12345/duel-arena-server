"""Админ-команды управления кланами через Telegram-бот.

/admin_list_clans              — показать все кланы
/admin_delete_clan <tag|id>    — удалить клан по тегу или id

Только для user_id из ADMIN_USER_IDS (env).
"""

from __future__ import annotations

import logging

from telegram import Update
from telegram.ext import ContextTypes

from config import ADMIN_USER_IDS
from database import db
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


class BotHandlersClanAdmin:
    @staticmethod
    async def admin_list_clans_command(update: Update, _ctx: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Команда недоступна.")
            return
        conn = db.get_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "SELECT c.id, c.name, c.tag, c.leader_id, "
                "(SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as cnt "
                "FROM clans c ORDER BY c.id"
            )
            rows = cur.fetchall()
        finally:
            conn.close()
        if not rows:
            await tg_api_call(update.message.reply_text, "📭 Кланов нет.")
            return
        lines = [f"📋 Кланов: {len(rows)}"]
        for r in rows:
            lines.append(
                f"• id={r['id']} [{r['tag']}] {r['name']} · leader={r['leader_id']} · 👥{r['cnt']}"
            )
        await tg_api_call(update.message.reply_text, "\n".join(lines))

    @staticmethod
    async def admin_delete_clan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Команда недоступна.")
            return
        args = context.args or []
        if not args:
            await tg_api_call(
                update.message.reply_text,
                "Использование: /admin_delete_clan <tag>\nили: /admin_delete_clan #<id>",
            )
            return
        arg = args[0].strip()
        conn = db.get_connection()
        cur = conn.cursor()
        try:
            if arg.startswith("#") and arg[1:].isdigit():
                cur.execute(
                    "SELECT id, name, tag FROM clans WHERE id = ?",
                    (int(arg[1:]),),
                )
            else:
                cur.execute(
                    "SELECT id, name, tag FROM clans WHERE UPPER(tag) = UPPER(?)",
                    (arg,),
                )
            row = cur.fetchone()
            if not row:
                await tg_api_call(update.message.reply_text, f"❌ Клан «{arg}» не найден.")
                return
            clan_id = int(row["id"])
            name = row["name"]
            tag = row["tag"]
            db._purge_clan_rows(cur, clan_id)
            conn.commit()
        except Exception as exc:
            logger.exception("admin_delete_clan failed")
            await tg_api_call(update.message.reply_text, f"⚠️ Ошибка: {exc}")
            return
        finally:
            conn.close()
        logger.info("event=admin_delete_clan user_id=%s clan_id=%s tag=%s", user.id, clan_id, tag)
        await tg_api_call(
            update.message.reply_text,
            f"✅ Клан [{tag}] {name} (id={clan_id}) удалён полностью.",
        )
