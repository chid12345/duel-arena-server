"""Команды /invite, /health, /wipe_me."""

import logging
import time

from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram import Update

from config import ADMIN_USER_IDS
from database import db
from battle_system import battle_system
from handlers.common import tg_api_call, RateLimiter, _referral_program_html

logger = logging.getLogger(__name__)


class BotHandlersInviteHealth:
    @staticmethod
    async def invite_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /invite — реферальная ссылка игрока."""
        user = update.effective_user
        if not RateLimiter.is_allowed(user.id, "command_invite", 1.0):
            await update.message.reply_text("⏳ Слишком часто. Подождите немного.")
            return
        db.get_or_create_player(user.id, user.username)
        ref_code = db.get_referral_code(user.id)
        stats = db.get_referral_stats(user.id)
        recent = db.get_recent_referrals(user.id, limit=3)
        bot_username = (await context.bot.get_me()).username
        text = _referral_program_html(bot_username, ref_code, stats, recent)
        keyboard = [[InlineKeyboardButton("⬅️ В меню", callback_data="back_to_main")]]
        await tg_api_call(
            update.message.reply_text,
            text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="HTML",
        )

    @staticmethod
    async def health_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /health для базового мониторинга."""
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(update.message.reply_text, "🚫 Команда доступна только администратору.")
            return

        metrics = db.get_health_metrics()
        health_text = (
            "🩺 **Health Snapshot**\n\n"
            f"👥 Игроков всего: {metrics['total_players']}\n"
            f"📅 DAU (24ч): {metrics['dau']}\n"
            f"⚔️ Боёв за час: {metrics['battles_hour']}\n"
            f"⏱️ Средняя длительность боя: {metrics['avg_battle_duration_ms']} ms"
        )
        db.log_metric_event("command_health", user.id)
        logger.info("event=command_health user_id=%s", user.id)
        await tg_api_call(update.message.reply_text, health_text)

    @staticmethod
    async def wipe_me_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Сброс своего профиля — доступно любому игроку (сбрасывает только себя)."""
        user = update.effective_user
        logger.info("event=command_wipe_me user_id=%s", user.id)
        db.log_metric_event("command_wipe_me", user.id)
        args = context.args or []
        if "confirm" not in args:
            await tg_api_call(
                update.message.reply_text,
                "⚠️ Это действие сотрёт весь прогресс (уровень, характеристики, бои).\n"
                "Золото, алмазы и клан <b>не затронуты</b>.\n\n"
                "Для подтверждения напишите:\n<code>/wipe_me confirm</code>",
                parse_mode="HTML",
            )
            return
        try:
            battle_system.force_abandon_battle(user.id)
            battle_system.mark_profile_reset(user.id, ttl_seconds=600)
        except Exception:
            pass
        db.wipe_player_profile(user.id)
        db.get_or_create_player(user.id, user.username or "")
        db.update_player_stats(user.id, {"profile_reset_ts": int(time.time())})
        await tg_api_call(
            update.message.reply_text,
            "✅ Профиль сброшен — добро пожаловать снова! Откройте /start.",
        )
