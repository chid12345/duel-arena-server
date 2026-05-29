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
        # Каждый шаг отдельно: при сбое — точный текст ошибки и
        # на каком этапе. Игрок видит факт ошибки в чате, я вижу
        # полный traceback в логах Render.
        import traceback as _tb
        steps: list[str] = []
        before: dict = {}
        after: dict = {}

        def _snap(tag: str) -> dict:
            conn = db.get_connection()
            cur = conn.cursor()
            try:
                cur.execute(
                    "SELECT level, premium_until, is_premium, first_premium_at, "
                    "equipped_avatar_id, gold, diamonds FROM players WHERE user_id = ?",
                    (user.id,),
                )
                row = cur.fetchone()
                return dict(row) if row else {"_note": "no player row"}
            finally:
                conn.close()

        # 1) Snapshot до
        try:
            before = _snap("before")
            steps.append("✓ snapshot ДО")
        except Exception as e:
            logger.exception("wipe_me before-snap uid=%s", user.id)
            steps.append(f"✗ snapshot ДО: {type(e).__name__}: {e}")

        # 2) battle_system locks (best-effort)
        try:
            battle_system.force_abandon_battle(user.id)
            battle_system.mark_profile_reset(user.id, ttl_seconds=600)
            steps.append("✓ battle_system unlock")
        except Exception as e:
            steps.append(f"⚠ battle_system: {type(e).__name__}: {e}")

        # 3) САМ WIPE — критичный шаг, ловим явно
        wipe_err = None
        try:
            db.wipe_player_profile(user.id, keep_wallet_clan_and_referrals=True)
            steps.append("✓ wipe_player_profile")
        except Exception as e:
            wipe_err = f"{type(e).__name__}: {e}"
            logger.exception("wipe_me WIPE FAILED uid=%s", user.id)
            steps.append(f"✗ wipe_player_profile: {wipe_err}")
            # Полный traceback тоже в чат — короткий, последние 6 строк
            tb_lines = _tb.format_exc().splitlines()[-6:]
            steps.append("traceback:\n" + "\n".join(tb_lines))

        # 4) get_or_create (recreate row if wipe deleted it)
        try:
            db.get_or_create_player(user.id, user.username or "")
            steps.append("✓ get_or_create_player")
        except Exception as e:
            logger.exception("wipe_me get_or_create FAILED uid=%s", user.id)
            steps.append(f"✗ get_or_create_player: {type(e).__name__}: {e}")

        # 5) Snapshot после
        try:
            after = _snap("after")
            steps.append("✓ snapshot ПОСЛЕ")
        except Exception as e:
            logger.exception("wipe_me after-snap uid=%s", user.id)
            steps.append(f"✗ snapshot ПОСЛЕ: {type(e).__name__}: {e}")

        logger.info("event=wipe_me_diag uid=%s before=%s after=%s steps=%s",
                    user.id, before, after, steps)

        diag_lines = [
            "🔍 Диагностика сброса:",
            "",
            "Шаги:",
            *steps,
            "",
            f"premium_until: {before.get('premium_until')!r} → {after.get('premium_until')!r}",
            f"is_premium: {before.get('is_premium')!r} → {after.get('is_premium')!r}",
            f"first_premium_at: {before.get('first_premium_at')!r} → {after.get('first_premium_at')!r}",
            f"avatar: {before.get('equipped_avatar_id')!r} → {after.get('equipped_avatar_id')!r}",
            f"level: {before.get('level')!r} → {after.get('level')!r}",
            f"gold/diamonds: {before.get('gold')}/{before.get('diamonds')} → "
            f"{after.get('gold')}/{after.get('diamonds')}",
        ]
        header = "❌ Сброс УПАЛ на этапе wipe_player_profile" if wipe_err \
            else "✅ Сброс выполнен. Откройте /start."
        # Telegram-сообщение максимум ~4096 символов — обрезаем с запасом.
        body = "\n".join(diag_lines)[:3500]
        await tg_api_call(
            update.message.reply_text,
            f"{header}\n\n{body}",
        )
