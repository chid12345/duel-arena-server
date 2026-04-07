"""
handlers/commands.py — обработчики команд Telegram (BotHandlers).
"""

import logging
import time
from html import escape as html_escape
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from config import *
from database import db
from battle_system import battle_system
from handlers.common import tg_api_call, RateLimiter, _referral_program_html
from handlers.ui_helpers import CallbackHandlers

logger = logging.getLogger(__name__)


class BotHandlers:
    """Основные обработчики бота"""

    @staticmethod
    async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /start"""
        user = update.effective_user
        if not RateLimiter.is_allowed(user.id, "command_start", 1.0):
            await update.message.reply_text("⏳ Слишком часто. Подождите немного.")
            return
        logger.info("event=command_start user_id=%s", user.id)
        db.log_metric_event("command_start", user.id)

        player = db.get_or_create_player(user.id, user.username)

        # Сохраняем chat_id для push-уведомлений
        if update.effective_chat:
            db.update_chat_id(user.id, update.effective_chat.id)

        # Обработка реферального deep link: /start ref_XXXXXXXXXX
        if context.args:
            ref_code = context.args[0]
            if ref_code.startswith("ref_"):
                ok_ref, referrer_uid = db.register_referral(user.id, ref_code)
                if ok_ref and referrer_uid is not None:
                    await BotHandlers.notify_referrer_join(context.bot, referrer_uid, user)

        # Применяем реген HP
        endurance_inv = stamina_stats_invested(player.get('max_hp', PLAYER_START_MAX_HP), player.get('level', 1))
        regen_result = db.apply_hp_regen(user.id, endurance_inv)
        if regen_result:
            player = dict(player)
            player['current_hp'] = regen_result['current_hp']

        # Проверяем ежедневный бонус
        daily_bonus = db.check_daily_bonus(user.id)

        # Итог боя, который не удалось вставить в старое сообщение (после «Обновить» / обрыва чата)
        if not battle_system.get_battle_status(user.id):
            pending = battle_system.peek_battle_end_ui(user.id)
            if pending:
                adapted = CallbackHandlers._adapt_result_for_user(pending, user.id)
                ok = await CallbackHandlers._deliver_battle_end_chat(
                    context.bot, update.effective_chat.id, player, adapted,
                )
                if ok:
                    battle_system.clear_battle_end_ui(user.id)
                    await CallbackHandlers._notify_level_up_chat(
                        context.bot, update.effective_chat.id, user.id, adapted,
                    )
                    if daily_bonus['can_claim']:
                        bonus_line = f"🎁 <b>Ежедневный бонус!</b> +{daily_bonus['bonus']} золота"
                        if daily_bonus['streak'] % 7 == 0:
                            bonus_line += f" и +{DIAMONDS_DAILY_STREAK} 💎"
                        await update.message.reply_text(bonus_line, parse_mode='HTML')
                    return

        extra_text = ""
        if battle_system.get_battle_status(user.id):
            extra_text = (
                "⚔️ <b>Бой ещё идёт на сервере</b> (в фоне).\n"
                "Прокрутите чат к сообщению с кнопками удара/блока или нажмите «Сбросить»."
            )
        elif battle_system.peek_battle_end_ui(user.id):
            extra_text = "📋 <b>Есть итог прошлого боя</b> — нажмите «🔄 Обновить», чтобы увидеть."
        if daily_bonus['can_claim']:
            bonus_line = f"🎁 <b>Ежедневный бонус!</b> +{daily_bonus['bonus']} золота"
            if daily_bonus['streak'] % 7 == 0:
                bonus_line += f" и +{DIAMONDS_DAILY_STREAK} 💎"
            extra_text = (extra_text + "\n" + bonus_line).strip()

        menu_rows = list(CallbackHandlers._main_menu_markup().inline_keyboard)
        if battle_system.get_battle_status(user.id):
            keyboard = [
                [InlineKeyboardButton("🧹 Сбросить зависший бой", callback_data="battle_abandon")]
            ] + menu_rows
        else:
            keyboard = menu_rows
        reply_markup = InlineKeyboardMarkup(keyboard)

        await CallbackHandlers._send_profile_card(
            update.message, player, user.username or "", reply_markup,
            is_message=True, extra_text=extra_text,
        )

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
        total_battles = player['wins'] + player['losses']
        win_rate = (player['wins'] / total_battles * 100) if total_battles > 0 else 0.0

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

        keyboard = [[InlineKeyboardButton("⬅️ В меню", callback_data='back_to_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await tg_api_call(
            update.message.reply_text,
            stats_text,
            reply_markup=reply_markup,
            parse_mode='HTML',
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

        rating_text = '🏆 **Топ-10 бойцов Арены**\n\n'

        for i, player in enumerate(top_players, 1):
            medal = '🥇' if i == 1 else '🥈' if i == 2 else '🥉' if i == 3 else f'{i}.'
            win_rate = player['wins'] / (player['wins'] + player['losses']) * 100 if (player['wins'] + player['losses']) > 0 else 0

            rating_text += f'{medal} {player["username"]}\n'
            rating_text += f'   📊 Уровень {player["level"]} | 🏆 {player["rating"]} рейтинга\n'
            rating_text += f'   🔥 {player["wins"]} побед | 📈 {win_rate:.1f}% WR\n\n'

        keyboard = [[InlineKeyboardButton("⬅️ В меню", callback_data='back_to_main')]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await tg_api_call(update.message.reply_text, rating_text, reply_markup=reply_markup)

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

        keyboard = [[InlineKeyboardButton("🎁 Забрать награду", callback_data='claim_daily_quest')]]
        if status["reward_claimed"]:
            quests_text += "\n✅ Награда уже получена сегодня."
            keyboard = [[InlineKeyboardButton("⬅️ В меню", callback_data='back_to_main')]]
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

    @staticmethod
    async def clan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /clan [create ИМЯ | ТЕГ] | [join ID] | [search ТЕКСТ]"""
        user = update.effective_user
        db.get_or_create_player(user.id, user.username)
        args = context.args or []

        if not args:
            # Показать info о своём клане или меню
            player = db.get_or_create_player(user.id, user.username)
            cid = player.get('clan_id')
            if cid:
                info = db.get_clan_info(cid)
                if info:
                    c = info['clan']
                    members = info['members']
                    text = (
                        f"⚔️ <b>[{html_escape(c['tag'])}] {html_escape(c['name'])}</b>\n"
                        f"👥 {len(members)}/20 участников · Уровень {c['level']}\n\n"
                    )
                    for m in members[:10]:
                        icon = "👑" if m['role'] == 'leader' else "⚔️"
                        text += f"{icon} {html_escape(m.get('username') or '—')} · ур.{m['level']} · {m['wins']}п\n"
                    await tg_api_call(update.message.reply_text, text, parse_mode='HTML')
                    return
            await tg_api_call(
                update.message.reply_text,
                "⚔️ Используй:\n/clan create ИМЯ | ТЕГ — создать\n/clan join ID — вступить\n/clan search ТЕКСТ — найти\n/clan leave — покинуть",
            )
            return

        sub = args[0].lower()

        if sub == 'create':
            raw = " ".join(args[1:])
            if '|' not in raw:
                await tg_api_call(update.message.reply_text, "❌ Формат: /clan create ИМЯ КЛАНА | ТЕГ")
                return
            name, tag = [x.strip() for x in raw.split('|', 1)]
            player = db.get_or_create_player(user.id, user.username)
            result = db.create_clan(user.id, name, tag)
            if result['ok']:
                await tg_api_call(
                    update.message.reply_text,
                    f"🏰 Клан <b>[{html_escape(result['tag'])}] {html_escape(result['name'])}</b> создан!\n"
                    f"Стоимость: {db.CLAN_CREATE_COST_GOLD} золота списано.",
                    parse_mode='HTML',
                )
            else:
                await tg_api_call(update.message.reply_text, f"❌ {result['reason']}")

        elif sub == 'join':
            try:
                cid = int(args[1])
            except (IndexError, ValueError):
                await tg_api_call(update.message.reply_text, "❌ Формат: /clan join ID")
                return
            result = db.join_clan(user.id, cid)
            msg = f"✅ Вступил в клан {result.get('clan_name', '')}!" if result['ok'] else f"❌ {result['reason']}"
            await tg_api_call(update.message.reply_text, msg)

        elif sub == 'leave':
            result = db.leave_clan(user.id)
            await tg_api_call(update.message.reply_text, "✅ Покинул клан." if result['ok'] else f"❌ {result['reason']}")

        elif sub == 'search':
            q = " ".join(args[1:])
            if not q:
                await tg_api_call(update.message.reply_text, "❌ Укажи тег или название: /clan search ТЕКСТ")
                return
            clans = db.search_clans(q)
            if not clans:
                await tg_api_call(update.message.reply_text, "Кланы не найдены.")
                return
            text = "🔍 <b>Результаты поиска:</b>\n\n"
            for c in clans:
                text += f"[{html_escape(c['tag'])}] {html_escape(c['name'])} — {c['member_count']}/20 · /clan join {c['id']}\n"
            await tg_api_call(update.message.reply_text, text, parse_mode='HTML')

        else:
            await tg_api_call(update.message.reply_text, "❌ Неизвестная подкоманда. /clan — список команд.")

    @staticmethod
    async def season_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /season — информация о текущем сезоне."""
        user = update.effective_user
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
        text += "\n💡 Топ-1: 100💎 · Топ-2: 50💎 · Топ-3: 25💎"
        await tg_api_call(update.message.reply_text, text, parse_mode='HTML')

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
        if result['ok']:
            await tg_api_call(
                update.message.reply_text,
                f"✅ Сезон {result['ended_season_id']} завершён. Награды выданы: {result['rewarded']} игрок(ов).\n"
                f"Начат новый сезон #{result['new_season_id']}: {new_name}",
            )
        else:
            await tg_api_call(update.message.reply_text, f"❌ {result['reason']}")

    @staticmethod
    async def pass_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /pass — Боевой пропуск."""
        user = update.effective_user
        player = db.get_or_create_player(user.id, user.username)
        bp = db.get_battle_pass(user.id)
        tiers = db.BATTLE_PASS_TIERS
        claimed = bp.get('last_claimed_tier', 0)
        text = "🎖️ <b>БОЕВОЙ ПРОПУСК</b>\n\n"
        for i, (b_need, w_need, d, g) in enumerate(tiers, 1):
            b_done = min(bp.get('battles_done', 0), b_need)
            w_done = min(bp.get('wins_done', 0), w_need)
            if i <= claimed:
                status = "✅ Получено"
            elif b_done >= b_need and w_done >= w_need:
                status = f"🎁 ГОТОВО — /pass claim {i}"
            else:
                status = f"⏳ {b_done}/{b_need} боёв · {w_done}/{w_need} побед"
            text += f"<b>Тир {i}:</b> {status}\n  Награда: +{d}💎 +{g}💰\n\n"
        await tg_api_call(update.message.reply_text, text, parse_mode='HTML')

    @staticmethod
    async def pass_claim_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /pass claim N — забрать награду за тир N."""
        user = update.effective_user
        args = context.args or []
        try:
            tier = int(args[1]) if len(args) > 1 else int(args[0])
        except (IndexError, ValueError):
            await tg_api_call(update.message.reply_text, "Использование: /pass claim 1")
            return
        result = db.claim_battle_pass_tier(user.id, tier)
        if result['ok']:
            await tg_api_call(
                update.message.reply_text,
                f"✅ Тир {tier} получен! +{result['diamonds']}💎 +{result['gold']}💰",
            )
        else:
            await tg_api_call(update.message.reply_text, f"❌ {result['reason']}")

    @staticmethod
    async def buy_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /buy — купить алмазы за Telegram Stars."""
        from telegram import LabeledPrice
        from config import PREMIUM_SUBSCRIPTION_STARS, PREMIUM_XP_BONUS_PERCENT

        packages = [
            ("100 💎 алмазов", 100, 50),
            ("300 💎 алмазов", 300, 130),
            ("500 💎 алмазов", 500, 200),
        ]
        text = (
            "💎 <b>Магазин Telegram Stars</b>\n\n"
            f"👑 <b>Premium подписка</b> — {PREMIUM_SUBSCRIPTION_STARS} ⭐\n"
            f"• Опыт за бои: +{PREMIUM_XP_BONUS_PERCENT}%\n\n"
            "<b>Алмазы:</b>\n"
        )
        keyboard = [
            [
                InlineKeyboardButton(
                    f"👑 Premium · {PREMIUM_SUBSCRIPTION_STARS}⭐",
                    callback_data="stars_buy_premium",
                )
            ],
        ]
        for title, diamonds, stars in packages:
            text += f"• {title} — {stars} ⭐\n"
            keyboard.append([InlineKeyboardButton(f"{title} · {stars}⭐", callback_data=f"stars_buy_{diamonds}_{stars}")])
        keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")])
        await tg_api_call(update.message.reply_text, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    @staticmethod
    async def pre_checkout_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Telegram Stars: подтверждение оплаты."""
        query = update.pre_checkout_query
        await query.answer(ok=True)

    @staticmethod
    async def successful_payment_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Telegram Stars: успешная оплата — алмазы, подписка Premium, реферальные начисления."""
        payment = update.message.successful_payment
        payload = (payment.invoice_payload or "").strip()
        user = update.effective_user
        stars = int(payment.total_amount or 0)

        if payload == "premium_sub":
            from config import PREMIUM_XP_BONUS_PERCENT
            ref = db.process_referral_first_premium(user.id, stars)
            if ref.get("ok"):
                xp_line = f"\n📈 Опыт за бои: <b>+{PREMIUM_XP_BONUS_PERCENT}%</b>"
                msg = f"✅ <b>Premium активирован!</b> Спасибо за поддержку.{xp_line}"
                if ref.get("renewal"):
                    msg = f"✅ <b>Подписка продлена.</b> Спасибо!{xp_line}"
                await tg_api_call(update.message.reply_text, msg, parse_mode="HTML")
            await BotHandlers.notify_referrer_stars_payment(
                context.bot, user.id, payload, 0, stars, ref or {}
            )
            return

        if not payload.startswith("diamonds_"):
            await tg_api_call(
                update.message.reply_text,
                "✅ Оплата получена. Если начисление не пришло — напишите в поддержку.",
            )
            return
        try:
            diamonds = int(payload.split("_")[1])
        except Exception:
            diamonds = 0
        if diamonds <= 0:
            return
        # Идемпотентное начисление: если TMA уже начислил через /api/shop/stars_confirm,
        # confirm_stars_payment вернёт already_credited и пропустит повторное начисление.
        package_id = f"d{diamonds}"
        result = db.confirm_stars_payment(user.id, package_id, diamonds, stars)
        ref = db.process_referral_vip_shop_purchase(user.id, stars=stars)
        if result.get("ok"):
            await tg_api_call(
                update.message.reply_text,
                f"✅ Оплата прошла! +{diamonds} 💎 начислено. Спасибо!",
            )
        else:
            # already_credited — TMA уже начислил, просто подтверждаем
            await tg_api_call(
                update.message.reply_text,
                f"✅ Оплата подтверждена! +{diamonds} 💎 уже на счету. Спасибо!",
            )
        await BotHandlers.notify_referrer_stars_payment(
            context.bot, user.id, payload, diamonds, stars, ref or {}
        )

    @staticmethod
    def _referral_buyer_label_html(user_id: int) -> str:
        p = db.get_or_create_player(user_id, "")
        un = (p.get("username") or "").strip()
        if un:
            return f"@{html_escape(un)}"
        return f"id {user_id}"

    @staticmethod
    async def notify_referrer_join(bot, referrer_id: int, new_user):
        """Сообщение рефереру: кто-то зашёл по ссылке (нужен chat_id реферера)."""
        cid = db.get_player_chat_id(referrer_id)
        if not cid:
            return
        un = (new_user.username or "").strip()
        if un:
            line = f"👋 По вашей ссылке зашёл игрок: <b>@{html_escape(un)}</b>"
        else:
            fn = html_escape(new_user.first_name or "игрок")
            line = f"👋 По вашей ссылке зашёл игрок: <b>{fn}</b> (id {new_user.id})"
        try:
            await bot.send_message(chat_id=cid, text=line, parse_mode="HTML")
        except Exception as exc:
            logger.warning("referrer join notify failed: %s", exc)

    @staticmethod
    async def notify_referrer_stars_payment(bot, buyer_id: int, payload: str, diamonds: int, stars: int, ref: dict):
        """Рефереру: реферал что-то купил за Stars + награда, если есть."""
        rid = db.get_referrer_id(buyer_id)
        if not rid:
            return
        cid = db.get_player_chat_id(rid)
        if not cid:
            return
        label = BotHandlers._referral_buyer_label_html(buyer_id)
        if payload == "premium_sub":
            if ref.get("renewal"):
                head = f"💳 Ваш реферал {label} продлил <b>Premium</b>."
            else:
                head = f"💳 Ваш реферал {label} купил <b>Premium</b> подписку."
        else:
            head = f"💳 Ваш реферал {label} купил <b>{diamonds}</b> 💎 за Stars ({stars}⭐)."
        tails = []
        if ref.get("reward_diamonds"):
            tails.append(f"Вам: +{ref['reward_diamonds']} 💎")
        if ref.get("reward_gold"):
            tails.append(f"Вам: +{ref['reward_gold']} 💰")
        if ref.get("rank") is not None and ref.get("reward_diamonds", 0) == 0 and ref.get("reward_gold", 0) == 0 and not ref.get("renewal"):
            tails.append(f"Платящий реферал №{ref['rank']} (первая подписка).")
        text = head
        if tails:
            text += "\n" + " · ".join(tails)
        try:
            await bot.send_message(chat_id=cid, text=text, parse_mode="HTML")
        except Exception as exc:
            logger.warning("referrer stars notify failed: %s", exc)

    @staticmethod
    async def notify_referrer_gold_shop(bot, buyer_id: int, item_key: str, ref_r: dict):
        """Рефереру: покупка за золото / алмазы в игровом магазине."""
        rid = db.get_referrer_id(buyer_id)
        if not rid:
            return
        cid = db.get_player_chat_id(rid)
        if not cid:
            return
        label = BotHandlers._referral_buyer_label_html(buyer_id)
        titles = {
            "hp_potion": "зелье HP",
            "xp_boost": "XP-буст",
            "stat_reset": "сброс статов",
        }
        what = titles.get(item_key, item_key)
        head = f"🛒 Ваш реферал {label} купил в магазине: <b>{what}</b>."
        tails = []
        if ref_r.get("reward_diamonds"):
            tails.append(f"Вам: +{ref_r['reward_diamonds']} 💎")
        if ref_r.get("reward_gold"):
            tails.append(f"Вам: +{ref_r['reward_gold']} 💰")
        text = head
        if tails:
            text += "\n" + " · ".join(tails)
        try:
            await bot.send_message(chat_id=cid, text=text, parse_mode="HTML")
        except Exception as exc:
            logger.warning("referrer gold shop notify failed: %s", exc)

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
