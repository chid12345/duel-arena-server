"""Команды /quests, /agent_code."""

import logging
import time

from telegram.ext import ContextTypes
from telegram import Update

from config import ADMIN_USER_IDS
from database import db
from battle_system import battle_system
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


class BotHandlersQuestsAdmin:
    @staticmethod
    async def quests_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /quests - ежедневные задания."""
        user = update.effective_user
        status = db.get_daily_quest_status(user.id)
        db.log_metric_event("command_quests", user.id)
        logger.info("event=command_quests user_id=%s", user.id)

        quests_text = (
            "📅 **Ежедневный квест**\n\n"
            "Задание: сыграть 3 боя и выиграть минимум 1 бой.\n\n"
            f"⚔️ Сыграно боев: {status['battles_played']}/3\n"
            f"🏆 Побед: {status['battles_won']}/1\n"
        )

        from telegram import InlineKeyboardButton, InlineKeyboardMarkup

        keyboard = [[InlineKeyboardButton("🎁 Забрать награду", callback_data="claim_daily_quest")]]
        if status["reward_claimed"]:
            quests_text += "\n✅ Награда уже получена сегодня."
            keyboard = [[InlineKeyboardButton("⬅️ В меню", callback_data="back_to_main")]]
        elif status["is_completed"]:
            quests_text += "\n🎉 Квест выполнен! Нажмите кнопку, чтобы забрать награду."
        else:
            quests_text += "\n⏳ Выполните условия, чтобы получить награду: 40 золота + 1 алмаз."

        await tg_api_call(
            update.message.reply_text,
            quests_text,
            reply_markup=InlineKeyboardMarkup(keyboard),
        )

    @staticmethod
    async def agent_code_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /agent_code — полный сброс своего профиля (только ADMIN_USER_IDS)."""
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(
                update.message.reply_text,
                "🚫 Команда недоступна.",
            )
            return
        logger.info("event=agent_code_reset user_id=%s", user.id)
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
            "✅ Профиль полностью сброшен — ты снова новый игрок!\n\nНажми /start чтобы начать.",
        )
