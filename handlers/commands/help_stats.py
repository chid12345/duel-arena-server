"""Команды /help, /stats, /rating."""

import logging
from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from telegram import Update

from config import *
from database import db
from handlers.common import tg_api_call, RateLimiter

logger = logging.getLogger(__name__)


class BotHandlersHelpStats:
    @staticmethod
    async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /help"""
        user = update.effective_user
        if not RateLimiter.is_allowed(user.id, "command_help", 0.8):
            await update.message.reply_text("⏳ Слишком часто. Подождите немного.")
            return
        logger.info("event=command_help user_id=%s", user.id)
        db.log_metric_event("command_help", user.id)

        _xp_win1 = victory_xp_for_player_level(PLAYER_START_LEVEL)
        _xp_need1 = exp_needed_for_next_level(PLAYER_START_LEVEL)
        _ap1 = intermediate_ap_steps_for_level(PLAYER_START_LEVEL)

        help_text = f'''
🎮 **Справка по Дуэль-Арене**

📋 **Основные команды:**
/start - главное меню
/help - эта справка
/stats - ваша статистика
/rating - топ игроков

⚔️ **Как сражаться:**
1. "🥊 В БОЙ!" — обычный бой с наградами и статистикой (без лимита по числу боёв). Если экран завис — "🧹 Сбросить зависший бой" (из /start или при повторном поиске боя)
2. Выберите зону атаки и защиты (полный ход за {TURN_ACTION_SECONDS} сек, иначе пропуск)
3. Противника можно посмотреть кнопкой «Соперник»
4. Бой идет до победы одного из бойцов

🏋️ **Прокачка (таблица v{get_table().get("version", "?")}, уровни 1…{MAX_LEVEL}):**
- За победу: **+{_xp_win1}** XP на ур.{PLAYER_START_LEVEL} (у каждого уровня своё значение в таблице), до следующего уровня на полоске нужно **{_xp_need1}** XP; **+{VICTORY_GOLD}** золота (у бота чуть меньше)
- За поражение: только **опыт** (доля от «как за победу» с тем же уроном), **без золота**
- За каждый уровень: награды из таблицы (пример перехода на ур.2: **+{stats_when_reaching_level(2)}** статов, **+{hp_when_reaching_level(2)}** к пулу HP, **+{gold_when_reaching_level(2)}** золота)
- По пути к следующему уровню: **апы** из таблицы — на полоске несколько порогов опыта, на каждом **+1** свободный стат (на ур.{PLAYER_START_LEVEL} сейчас **{_ap1}** ап(ов) на полоске)
- В пул выносливости вручную: +{STAMINA_PER_FREE_STAT} за 1 свободный стат (меню «Статы»)

⚡ **Статы в бою:**
- Сила — урон (чем выше сила, тем больше % к базовому урону)
- Ловкость — шанс увернуться от удара
- Крит — шанс критического удара (и улучшения за золото)
- Выносливость — чем больше макс. пул, тем сильнее броня (меньше входящего урона)

💰 **Экономика:**
- Золото: для покупок в магазине
- Алмазы: премиум валюта
- Ежедневный бонус: +20 золота
- **Сброс прогресса за USDT** (Mini App → магазин → CryptoPay, только USDT): уровень/статы/бои с нуля; **золото, алмазы, клан и рефералка** сохраняются

⚠️ **Важно:**
3 пропуска хода подряд (не успели выбрать атаку и защиту за время раунда) = поражение!

🔧 **Админ:** /health — метрики; /wipe_me — полный сброс **вашего** профиля (только из списка админов).

❓ **Вопросы?** Обратитесь к администратору бота.
        '''

        await tg_api_call(update.message.reply_text, help_text)

    @staticmethod
    async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /stats"""
        user = update.effective_user
        if not RateLimiter.is_allowed(user.id, "command_stats", 1.2):
            await update.message.reply_text("⏳ Слишком часто. Подождите немного.")
            return
        logger.info("event=command_stats user_id=%s", user.id)
        db.log_metric_event("command_stats", user.id)

        player = db.get_or_create_player(user.id, user.username)

        improvements = db.get_player_improvements(user.id)
        total_battles = player["wins"] + player["losses"]
        win_rate = (player["wins"] / total_battles * 100) if total_battles > 0 else 0.0

        un = html_escape(user.username or "")
        stats_text = (
            f"📈 <b>Подробная статистика</b>\n\n"
            f"👤 <b>Имя:</b> {un}\n"
            f"📊 <b>Уровень:</b> {player['level']}\n"
            f"⭐ <b>Опыт:</b> {format_exp_progress(player['exp'], player['level'])}\n"
            f"🏆 <b>Рейтинг:</b> {player['rating']}\n\n"
            f"❤️ <b>Выносливость:</b> {stamina_stats_invested(player['max_hp'], player['level'])} "
            f"{player['current_hp']}/{player['max_hp']}\n"
            f"💪 <b>Сила:</b> {player['strength']} "
            f"({player.get('free_stats', 0)} свободных статов)\n"
            f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
            f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n\n"
            f"💰 <b>Золото:</b> {player['gold']}\n"
            f"💎 <b>Алмазы:</b> {player['diamonds']}\n\n"
            f"🔥 <b>Побед:</b> {player['wins']}\n"
            f"💔 <b>Поражений:</b> {player['losses']}\n"
            f"📈 <b>Win Rate:</b> {win_rate:.1f}%\n\n"
            f"🌟 <b>Улучшения:</b>\n"
            f"⚔️ Сила атаки: {improvements.get('attack_power', 0)}/5\n"
            f"🏃 Уклонение: {improvements.get('dodge', 0)}/5\n"
            f"🛡️ Мастерство блоков: {improvements.get('block_mastery', 0)}/5\n"
            f"⚡ Крит. удары: {improvements.get('critical_strike', 0)}/5"
        )

        keyboard = [[InlineKeyboardButton("⬅️ В меню", callback_data="back_to_main")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await tg_api_call(
            update.message.reply_text,
            stats_text,
            reply_markup=reply_markup,
            parse_mode="HTML",
        )

    @staticmethod
    async def rating_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /rating"""
        user = update.effective_user
        if not RateLimiter.is_allowed(user.id, "command_rating", 1.2):
            await update.message.reply_text("⏳ Слишком часто. Подождите немного.")
            return
        logger.info("event=command_rating user_id=%s", user.id)
        db.log_metric_event("command_rating", user.id)

        top_players = db.get_top_players(10)

        rating_text = "🏆 **Топ-10 бойцов Арены**\n\n"

        for i, player in enumerate(top_players, 1):
            medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
            win_rate = (
                player["wins"] / (player["wins"] + player["losses"]) * 100
                if (player["wins"] + player["losses"]) > 0
                else 0
            )

            rating_text += f"{medal} {player['username']}\n"
            rating_text += f"   📊 Уровень {player['level']} | 🏆 {player['rating']} рейтинга\n"
            rating_text += f"   🔥 {player['wins']} побед | 📈 {win_rate:.1f}% WR\n\n"

        keyboard = [[InlineKeyboardButton("⬅️ В меню", callback_data="back_to_main")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await tg_api_call(update.message.reply_text, rating_text, reply_markup=reply_markup)
