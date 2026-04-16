"""Команды /season, /end_season, /pass."""

import logging
from html import escape as html_escape

from telegram.ext import ContextTypes
from telegram import Update

from config import ADMIN_USER_IDS
from database import db
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


class BotHandlersSeasonPass:
    @staticmethod
    async def season_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /season — информация о текущем сезоне."""
        season = db.get_active_season()
        if not season:
            await tg_api_call(update.message.reply_text, "Активного сезона нет.")
            return
        lb = db.get_season_leaderboard(season["id"], 10)
        started = str(season["started_at"])[:10]
        text = f"🌟 <b>{html_escape(season['name'])}</b>\n📅 Старт: {started}\n\n🏆 <b>Топ-10 сезона:</b>\n"
        for i, p in enumerate(lb, 1):
            medal = ("🥇", "🥈", "🥉")[i - 1] if i <= 3 else f"{i}."
            un = html_escape(p.get("username") or "—")
            text += f"{medal} {un} · {p['wins']}W/{p['losses']}L · {p['rating']}⭐\n"
        if not lb:
            text += "Никто ещё не сыграл.\n"
        text += "\n💡 Награды: 🥇500💰+200💎 · 🥈300💰+120💎 · 🥉200💰+75💎 · Топ-10: 50💰+20💎"
        await tg_api_call(update.message.reply_text, text, parse_mode="HTML")

    @staticmethod
    async def end_season_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /end_season — завершить сезон (только админ)."""
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Только для администратора.")
            return
        args = context.args or []
        new_name = " ".join(args) or "Новый сезон"
        result = db.end_season(new_name)
        if result["ok"]:
            await tg_api_call(
                update.message.reply_text,
                f"✅ Сезон {result['ended_season_id']} завершён. Награды выданы: {result['rewarded']} игрок(ов).\n"
                f"Начат новый сезон #{result['new_season_id']}: {new_name}",
            )
        else:
            await tg_api_call(update.message.reply_text, f"❌ {result['reason']}")

