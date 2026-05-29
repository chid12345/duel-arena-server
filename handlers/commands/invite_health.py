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
        # Снимок состояния ДО сброса — для диагностики (видно, что именно
        # стояло у игрока и реально ли wipe всё это занулил).
        try:
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT level, premium_until, is_premium, first_premium_at, "
                "equipped_avatar_id, gold, diamonds FROM players WHERE user_id = ?",
                (user.id,),
            )
            before_row = cur.fetchone()
            conn.close()
            before = dict(before_row) if before_row else {}
        except Exception as _e:
            before = {"error": str(_e)}
        try:
            battle_system.force_abandon_battle(user.id)
            battle_system.mark_profile_reset(user.id, ttl_seconds=600)
        except Exception:
            pass
        # keep_wallet_clan_and_referrals=True — ровно тот же путь, что платный
        # сброс (раньше /wipe_me звал wipe БЕЗ keep → удалял всю строку, что
        # противоречило тексту «Золото, алмазы и клан не затронуты»).
        db.wipe_player_profile(user.id, keep_wallet_clan_and_referrals=True)
        db.get_or_create_player(user.id, user.username or "")
        # Снимок ПОСЛЕ — сразу видно, что в БД действительно изменилось.
        try:
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT level, premium_until, is_premium, first_premium_at, "
                "equipped_avatar_id, gold, diamonds FROM players WHERE user_id = ?",
                (user.id,),
            )
            after_row = cur.fetchone()
            conn.close()
            after = dict(after_row) if after_row else {}
        except Exception as _e:
            after = {"error": str(_e)}
        logger.info("event=wipe_me_diag uid=%s before=%s after=%s", user.id, before, after)
        diag = (
            f"\n\n🔍 Диагностика:\n"
            f"premium_until: {before.get('premium_until')!r} → {after.get('premium_until')!r}\n"
            f"is_premium: {before.get('is_premium')!r} → {after.get('is_premium')!r}\n"
            f"first_premium_at: {before.get('first_premium_at')!r} → {after.get('first_premium_at')!r}\n"
            f"avatar: {before.get('equipped_avatar_id')!r} → {after.get('equipped_avatar_id')!r}\n"
            f"level: {before.get('level')!r} → {after.get('level')!r}\n"
            f"gold/diamonds (должны сохраниться): "
            f"{before.get('gold')}/{before.get('diamonds')} → "
            f"{after.get('gold')}/{after.get('diamonds')}"
        )
        await tg_api_call(
            update.message.reply_text,
            "✅ Профиль сброшен — добро пожаловать снова! Откройте /start." + diag,
        )
