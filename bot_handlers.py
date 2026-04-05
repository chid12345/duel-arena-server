"""
Обработчики команд и кнопок для Duel Arena Bot
"""

import asyncio
import logging
import time
from html import escape as html_escape
from typing import Optional, Tuple
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from telegram.error import BadRequest, NetworkError, RetryAfter, TimedOut

from config import *
from database import db
from battle_system import battle_system
from profile_card import generate_profile_card

logger = logging.getLogger(__name__)


def _referral_milestone_bar(paying: int, width: int = 12) -> str:
    """Полоска прогресса до 30 платящих (без цифр — только шкала)."""
    cap = 30
    filled = min(width, int(width * min(int(paying), cap) / cap))
    return "█" * filled + "░" * (width - filled)


def _referral_program_html(
    bot_username: str,
    ref_code: str,
    stats: dict,
    recent_rows: list,
) -> str:
    """Экран реферальной программы: ссылка в pre/code для копирования в Telegram, правила, статистика."""
    invite_url = f"https://t.me/{bot_username}?start={ref_code}"
    ps = int(stats.get("paying_subscribers") or 0)
    inv = int(stats.get("invited_count") or 0)
    d = int(stats.get("total_reward_diamonds") or 0)
    g = int(stats.get("total_reward_gold") or 0)
    bar = _referral_milestone_bar(ps)

    if ps < 10:
        tier_line = f"{REFERRAL_PCT_SUB_RANK_1_10}% разово за первую Premium подписку"
        hint = f"ещё <b>{10 - ps}</b> платящих → уровень <b>{REFERRAL_PCT_SUB_RANK_11_30}%</b>"
    elif ps < 30:
        tier_line = f"{REFERRAL_PCT_SUB_RANK_11_30}% разово за первую Premium"
        hint = f"ещё <b>{30 - ps}</b> платящих → уровень <b>{REFERRAL_PCT_SUB_RANK_31_PLUS}%</b> и бонус с магазина"
    else:
        tier_line = (
            f"{REFERRAL_PCT_SUB_RANK_31_PLUS}% за первую Premium + "
            f"{REFERRAL_PCT_VIP_ALL_SHOP}% с покупок у VIP-приглашённых"
        )
        hint = "максимальный уровень реферальных %"

    lines = [
        "👥 <b>РЕФЕРАЛЬНАЯ ПРОГРАММА</b>",
        "──────────────",
        "",
        "🔗 <b>Твоя ссылка</b>",
        f"<pre>{html_escape(invite_url)}</pre>",
        "<i>Нажми на серый блок — скопируется весь адрес.</i>",
        "",
        "🔗 <b>Код приглашения</b> (коротко)",
        f"<code>{html_escape(ref_code)}</code>",
        "",
        "📊 <b>Статистика</b>",
        f"👤 Всего пришло: <b>{inv}</b>",
        f"💳 Из них платили: <b>{ps}</b>",
        f"💎 Алмазы: <b>{d}</b> · 💰 Золото: <b>{g}</b>",
        "",
        "🏆 <b>Твой уровень</b>",
        tier_line,
        f"<code>{bar}</code>",
        hint,
        "",
        "💡 <b>Как работает</b>",
        f"• 1–10 платящих → <b>{REFERRAL_PCT_SUB_RANK_1_10}%</b> с первой Premium (разово)",
        (
            f"• 11–30 → <b>{REFERRAL_PCT_SUB_RANK_11_30}%</b> (разово) | "
            f"31+ → <b>{REFERRAL_PCT_SUB_RANK_31_PLUS}%</b> и <b>{REFERRAL_PCT_VIP_ALL_SHOP}%</b> "
            f"с покупок у VIP-приглашённых"
        ),
        "",
        "🔔 Уведомления в личку: когда друг зашёл по ссылке и при его покупках.",
    ]
    if recent_rows:
        lines.append("")
        lines.append("👤 <b>Последние рефералы</b>")
        for r in recent_rows:
            un = (r.get("username") or "").strip()
            if un:
                lines.append(f"⭐ @{html_escape(un)}")
            else:
                lines.append(f"⭐ id {r['referred_id']}")
    return "\n".join(lines)


# Один ход боя на пользователя — защита от дублей при быстрых нажатиях
_battle_turn_locks: dict[int, asyncio.Lock] = {}

def _battle_turn_lock(user_id: int) -> asyncio.Lock:
    if user_id not in _battle_turn_locks:
        _battle_turn_locks[user_id] = asyncio.Lock()
    return _battle_turn_locks[user_id]

def _telegram_message_unchanged(exc: BaseException) -> bool:
    """Telegram не даёт edit, если текст/клавиатура совпадают — это не ошибка логики."""
    msg = (getattr(exc, "message", None) or str(exc) or "").lower()
    return "message is not modified" in msg


async def tg_api_call(call, *args, retries: int = 3, base_delay: float = 0.4, **kwargs):
    """Надёжный вызов Telegram API с retry/backoff (BadRequest не ретраим — это логика API)."""
    for attempt in range(retries):
        try:
            return await call(*args, **kwargs)
        except BadRequest:
            raise
        except RetryAfter as exc:
            wait_seconds = float(getattr(exc, "retry_after", 1.0))
            await asyncio.sleep(wait_seconds + 0.1)
        except (TimedOut, NetworkError):
            if attempt == retries - 1:
                raise
            await asyncio.sleep(base_delay * (2 ** attempt))

class RateLimiter:
    """Простой in-memory rate limiter для антифлуда."""

    _last_request = {}

    @classmethod
    def is_allowed(cls, user_id: int, action: str, min_interval: float) -> bool:
        now = time.monotonic()
        key = (user_id, action)
        last_seen = cls._last_request.get(key, 0.0)

        if now - last_seen < min_interval:
            return False

        cls._last_request[key] = now
        return True

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
        db.wipe_player_profile(user.id)
        db.get_or_create_player(user.id, user.username or "")
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
        """Команда /pass — Battle Pass."""
        user = update.effective_user
        player = db.get_or_create_player(user.id, user.username)
        bp = db.get_battle_pass(user.id)
        tiers = db.BATTLE_PASS_TIERS
        claimed = bp.get('last_claimed_tier', 0)
        text = "🎖️ <b>BATTLE PASS</b>\n\n"
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
        """Сброс профиля (только ADMIN_USER_IDS): удаление строки и создание нового персонажа."""
        user = update.effective_user
        if user.id not in ADMIN_USER_IDS:
            await tg_api_call(
                update.message.reply_text,
                "🚫 Команда /wipe_me доступна только администраторам бота.",
            )
            return
        logger.info("event=command_wipe_me user_id=%s", user.id)
        db.log_metric_event("command_wipe_me", user.id)
        db.wipe_player_profile(user.id)
        db.get_or_create_player(user.id, user.username or "")
        await tg_api_call(
            update.message.reply_text,
            "✅ Профиль полностью сброшен — как новый аккаунт. Откройте /start.",
        )

class CallbackHandlers:
    """Обработчики кнопок"""

    @staticmethod
    def _combat_stats_summary(player: dict) -> str:
        """Строка с реальными % уворота/крита/брони/урона для экрана статов."""
        lv    = int(player.get('level', 1))
        s     = int(player.get('strength', PLAYER_START_STRENGTH))
        agi   = int(player.get('endurance', PLAYER_START_ENDURANCE))
        intu  = int(player.get('crit', PLAYER_START_CRIT))
        mhp   = int(player.get('max_hp', PLAYER_START_MAX_HP))

        # Средний противник того же уровня (равное распределение)
        tf = total_free_stats_at_level(lv)
        avg_agi  = max(1, PLAYER_START_ENDURANCE + tf // 4)
        avg_intu = max(1, PLAYER_START_CRIT      + tf // 4)

        # Уворот против среднего противника
        dodge_pct = min(DODGE_MAX_CHANCE, agi / (agi + avg_agi) * DODGE_MAX_CHANCE) * 100

        # Крит против среднего противника
        crit_pct  = min(CRIT_MAX_CHANCE, intu / (intu + avg_intu) * CRIT_MAX_CHANCE) * 100

        # Броня (точная, только от своих статов)
        stamina   = stamina_stats_invested(mhp, lv)
        armor_pct = min(ARMOR_ABSOLUTE_MAX,
                        stamina / (stamina + ARMOR_STAMINA_K_ABS)) * 100 if stamina > 0 else 0

        # Базовый урон от Силы (текущая формула: flat*lv + scale*str^power)
        dmg = int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER))

        return (
            f"⚔️ Урон: ~{dmg}  |  🛡 Броня: -{armor_pct:.0f}%\n"
            f"🤸 Уворот: ~{dodge_pct:.0f}%  |  💥 Крит: ~{crit_pct:.0f}%\n"
            f"<i>(уворот и крит — против равного противника)</i>"
        )

    @staticmethod
    def _hp_status_line(player: dict) -> str:
        """Строка HP с инфо о регене. Если не полное — показывает темп и ETA."""
        mh = int(player.get('max_hp', PLAYER_START_MAX_HP))
        ch = int(player.get('current_hp', mh))
        inv = stamina_stats_invested(mh, player.get('level', 1))
        if ch >= mh:
            return f"{ch}/{mh} ✅"
        endurance_mult = 1.0 + inv * HP_REGEN_ENDURANCE_BONUS
        regen_per_min = round(mh / HP_REGEN_BASE_SECONDS * endurance_mult * 60, 1)
        hp_missing = mh - ch
        secs_to_full = int(hp_missing / max(0.001, mh / HP_REGEN_BASE_SECONDS * endurance_mult))
        mins, secs = divmod(secs_to_full, 60)
        eta = f"{mins}м {secs}с" if mins else f"{secs}с"
        return f"{ch}/{mh}  ⏱ +{regen_per_min} HP/мин · полное через {eta}"

    @staticmethod
    def _welcome_html(player: dict, username: str) -> str:
        """Главный экран: профиль, персонаж (эмодзи), статы. HTML."""
        u = html_escape(username or "Боец")
        inv = stamina_stats_invested(player['max_hp'], player['level'])
        return (
            f"{MESSAGES['welcome']}\n\n"
            f"👤 <b>Боец:</b> {u}\n"
            f"📊 <b>Уровень:</b> {player['level']} · 💰 <b>Золото:</b> {player['gold']}\n"
            f"🏆 <b>Рейтинг:</b> {player['rating']}\n\n"
            f"🧍 <b>Ваш персонаж</b>\n"
            f"💪 <b>Сила:</b> {player['strength']}\n"
            f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
            f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n"
            f"❤️ <b>Выносливость:</b> {inv} · {CallbackHandlers._hp_status_line(player)}\n\n"
            f"⭐ <b>Опыт:</b> {format_exp_progress(player['exp'], player['level'])}\n"
            f"💎 <b>Алмазы:</b> {player['diamonds']}\n"
            f"🔥 <b>Побед:</b> {player['wins']}\n"
            f"💔 <b>Поражений:</b> {player['losses']}"
        )

    @staticmethod
    async def _send_profile_card(target, player: dict, username: str, reply_markup, is_message=False, extra_text: str = ""):
        """
        Отправить/обновить карточку профиля как фото.
        target: update.message (is_message=True) или query (callback).
        Если фото уже есть — edit_message_media, иначе send_photo / reply_photo.
        """
        from telegram import InputMediaPhoto
        import io

        player = dict(player)
        player.setdefault('username', username)
        img_bytes = generate_profile_card(player)
        caption = extra_text or ""

        if is_message:
            # Команда /start — отправляем новое фото
            try:
                await tg_api_call(
                    target.reply_photo,
                    photo=img_bytes,
                    caption=caption or None,
                    reply_markup=reply_markup,
                    parse_mode='HTML',
                )
            except Exception as e:
                logger.warning("profile_card send failed, fallback to text: %s", e)
                text = CallbackHandlers._welcome_html(player, username)
                await tg_api_call(target.reply_text, text, reply_markup=reply_markup, parse_mode='HTML')
            return

        # Callback — проверяем текущее сообщение
        msg = target.message
        if msg and msg.photo:
            # Уже фото — обновляем через edit_message_media
            try:
                media = InputMediaPhoto(
                    media=img_bytes,
                    caption=caption or None,
                    parse_mode='HTML',
                )
                await tg_api_call(target.edit_message_media, media=media, reply_markup=reply_markup)
                return
            except Exception as e:
                logger.warning("edit_message_media failed: %s", e)
        # Текстовое сообщение — удаляем и шлём фото
        try:
            if msg:
                try:
                    await msg.delete()
                except Exception:
                    pass
            chat_id = msg.chat_id if msg else target.from_user.id
            bot = target.get_bot()
            await tg_api_call(
                bot.send_photo,
                chat_id=chat_id,
                photo=img_bytes,
                caption=caption or None,
                reply_markup=reply_markup,
                parse_mode='HTML',
            )
        except Exception as e:
            logger.warning("profile_card send_photo failed, fallback to text: %s", e)
            text = CallbackHandlers._welcome_html(player, username)
            try:
                await CallbackHandlers._callback_set_message(
                    target, text, reply_markup=reply_markup, parse_mode='HTML',
                )
            except Exception:
                pass

    @staticmethod
    def _main_menu_markup():
        """Главное меню после боя или для возврата (как у /start — с «Обновить»)."""
        rows = []
        if WEBAPP_PUBLIC_URL:
            rows.append(
                [
                    InlineKeyboardButton(
                        "🎮 Mini App",
                        web_app=WebAppInfo(url=WEBAPP_PUBLIC_URL),
                    )
                ]
            )
        rows.extend(
            [
                [InlineKeyboardButton("🥊 В БОЙ!", callback_data='find_battle')],
                [InlineKeyboardButton("🔄 Обновить", callback_data='refresh_main')],
                [
                    InlineKeyboardButton("📊 СТАТЫ", callback_data='training'),
                    InlineKeyboardButton("📈 СВОДКА", callback_data='stats'),
                ],
                [
                    InlineKeyboardButton("🏆 РЕЙТИНГ", callback_data='rating'),
                    InlineKeyboardButton("🌟 СЕЗОН", callback_data='season_info'),
                ],
                [
                    InlineKeyboardButton("🛍️ МАГАЗИН", callback_data='shop'),
                    InlineKeyboardButton("🎖️ BATTLE PASS", callback_data='battle_pass'),
                ],
                [
                    InlineKeyboardButton("⚔️ КЛАН", callback_data='clan_menu'),
                    InlineKeyboardButton("🔗 Пригласить", callback_data='show_invite'),
                ],
            ]
        )
        return InlineKeyboardMarkup(rows)

    @staticmethod
    def _stale_battle_markup():
        """Меню, когда бой ещё в памяти, но интерфейс мог зависнуть."""
        rows = [[InlineKeyboardButton("🧹 Сбросить зависший бой", callback_data="battle_abandon")]]
        rows.extend(list(CallbackHandlers._main_menu_markup().inline_keyboard))
        return InlineKeyboardMarkup(rows)

    @staticmethod
    def _battle_status_line(ctx: dict) -> str:
        if ctx.get('waiting_opponent'):
            return "⏳⋯"
        pa = ctx.get('pending_attack')
        pd = ctx.get('pending_defense')
        a_icon = "✓" if pa else "·"
        d_icon = "✓" if pd else "·"
        return f"🗡️{a_icon} · 🛡️{d_icon}"

    @staticmethod
    def _build_battle_screen_html(ctx: dict) -> str:
        st_iv = int(ctx.get('your_stamina_invested', 0))
        line1 = (
            f"❤️ вы {st_iv} {ctx['your_hp']}/{ctx['your_max']} · "
            f"враг {ctx['opp_hp']}/{ctx['opp_max']}"
        )
        line2 = CallbackHandlers._battle_status_line(ctx)
        line3 = (ctx.get('turn_timer_line') or '').strip()
        lines = [line1, line2]
        if line3:
            lines.append(line3)
        return "\n".join(lines)

    @staticmethod
    def _battle_message_html_for_user(user_id: int):
        """Полный HTML сообщения боя (лог + экран) и галочки для клавиатуры."""
        ctx = battle_system.get_battle_ui_context(user_id)
        if not ctx:
            return None
        bid = battle_system.battle_queue.get(user_id)
        battle = battle_system.active_battles.get(bid) if bid else None
        if not battle:
            return None
        prefix = battle.get('ui_message_prefix') or ''
        parts = []
        clog_lines = battle.get('combat_log_lines') or []
        if clog_lines:
            clog = '\n\n'.join(clog_lines)
            parts.append(f"📜 <b>Лог боя</b>\n{clog}")
        parts.append(CallbackHandlers._build_battle_screen_html(ctx))
        body = "\n\n".join(parts)
        text = f"{prefix}{body}" if prefix else body
        return text, ctx.get('pending_attack'), ctx.get('pending_defense')

    @staticmethod
    def _battle_inline_markup(sel_attack=None, sel_defense=None):
        """✅ на выбранных зонах; третья строка — автоход."""
        keys = (('HEAD', 'Голова'), ('TORSO', 'Тело'), ('LEGS', 'Ноги'))
        row1 = [
            InlineKeyboardButton(
                f"{'✅ ' if sel_attack == k else ''}👊 {lab}",
                callback_data=f'attack_{k}',
            )
            for k, lab in keys
        ]
        row2 = [
            InlineKeyboardButton(
                f"{'✅ ' if sel_defense == k else ''}🛡️ {lab}",
                callback_data=f'defend_{k}',
            )
            for k, lab in keys
        ]
        row3 = [
            InlineKeyboardButton("👁 Соперник", callback_data='battle_opponent_stats'),
            InlineKeyboardButton("🔄", callback_data='battle_refresh'),
            InlineKeyboardButton("🎲 Авто ход", callback_data='battle_auto'),
        ]
        return InlineKeyboardMarkup([row1, row2, row3])

    @staticmethod
    async def _callback_set_message(
        query,
        text: str,
        *,
        reply_markup=None,
        parse_mode: Optional[str] = "HTML",
    ) -> Tuple[int, int]:
        """
        Заменить текст сообщения по callback. Если сообщение — фото (карточка /start),
        Telegram не даёт edit_message_text: удаляем и шлём новое текстовое.
        Возвращает (chat_id, message_id) для привязки UI боя.
        """
        bot = query.get_bot()
        msg = query.message
        if not msg:
            send_kw = dict(
                chat_id=query.from_user.id,
                text=text,
                reply_markup=reply_markup,
            )
            if parse_mode is not None:
                send_kw["parse_mode"] = parse_mode
            sent = await tg_api_call(bot.send_message, **send_kw)
            return sent.chat_id, sent.message_id
        if msg.photo:
            chat_id = msg.chat_id
            try:
                await tg_api_call(msg.delete)
            except Exception as exc:
                logger.warning("_callback_set_message: delete photo: %s", exc)
            send_kw = dict(chat_id=chat_id, text=text, reply_markup=reply_markup)
            if parse_mode is not None:
                send_kw["parse_mode"] = parse_mode
            sent = await tg_api_call(bot.send_message, **send_kw)
            return sent.chat_id, sent.message_id
        await tg_api_call(query.edit_message_text, text, reply_markup=reply_markup, parse_mode=parse_mode)
        return msg.chat_id, msg.message_id

    @staticmethod
    def _sync_battle_ui_pointer(user_id: int, chat_id: int, message_id: int) -> None:
        """Обновить chat_id/message_id сообщения боя после delete+send (иначе таймер и PvP push целят в старое)."""
        bid = battle_system.battle_queue.get(user_id)
        if not bid:
            return
        b = battle_system.active_battles.get(bid)
        if not b or not b.get('battle_active'):
            return
        if b.get('is_bot2'):
            battle_system.set_battle_ui_message(user_id, chat_id, message_id)
            return
        p1_uid = b['player1']['user_id']
        if user_id == p1_uid:
            battle_system.set_battle_ui_message(user_id, chat_id, message_id)
        elif b['player2'].get('user_id') == user_id:
            battle_system.set_battle_p2_ui_message(user_id, chat_id, message_id)

    @staticmethod
    async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Основной обработчик callback запросов"""
        query = update.callback_query
        user = update.effective_user

        callback_data = query.data
        is_battle_cb = (
            callback_data.startswith('attack_')
            or callback_data.startswith('defend_')
            or callback_data == 'battle_auto'
            or callback_data == 'battle_opponent_stats'
            or callback_data == 'battle_refresh'
        )
        if not is_battle_cb:
            try:
                await query.answer()
            except Exception:
                pass

        if not RateLimiter.is_allowed(user.id, "callback", 0.5):
            try:
                await query.answer("⏳ Слишком много нажатий. Подождите.", show_alert=False)
            except Exception:
                pass
            return
        
        player = db.get_or_create_player(user.id, user.username)

        try:
            # Обработка кнопок
            if callback_data == 'find_battle':
                await CallbackHandlers.find_battle(query, player)
            elif callback_data == 'battle_abandon':
                await CallbackHandlers.handle_battle_abandon(query, player)
            elif callback_data == 'training':
                await CallbackHandlers.show_training(query, player)
            elif callback_data == 'rating':
                await CallbackHandlers.show_rating(query, player)
            elif callback_data == 'shop':
                await CallbackHandlers.show_shop(query, player)
            elif callback_data == 'shop_weapons':
                await CallbackHandlers.show_shop_category(query, player, 'weapons')
            elif callback_data == 'shop_armor':
                await CallbackHandlers.show_shop_category(query, player, 'armor')
            elif callback_data == 'shop_consumables':
                await CallbackHandlers.show_shop_category(query, player, 'consumables')
            elif callback_data == 'shop_premium':
                await CallbackHandlers.show_shop_category(query, player, 'premium')
            elif callback_data == 'stats':
                await CallbackHandlers.show_stats(query, player)
            elif callback_data == 'back_to_main':
                await CallbackHandlers.back_to_main(query, player)
            elif callback_data == 'back':
                await CallbackHandlers.back(query, player)
            elif callback_data == 'refresh_main':
                await CallbackHandlers.refresh_main(query, player)
            elif callback_data == 'claim_daily_quest':
                await CallbackHandlers.claim_daily_quest(query, player)

            # Сезон
            elif callback_data == 'season_info':
                await CallbackHandlers.show_season_info(query, player)

            # Battle Pass
            elif callback_data == 'battle_pass':
                await CallbackHandlers.show_battle_pass(query, player)
            elif callback_data.startswith('bp_claim_'):
                tier = int(callback_data.split('_')[-1])
                await CallbackHandlers.claim_battle_pass_tier(query, player, tier)

            # Кланы
            elif callback_data == 'clan_menu':
                await CallbackHandlers.show_clan_menu(query, player)
            elif callback_data == 'clan_create_prompt':
                await CallbackHandlers.clan_create_prompt(query, player)
            elif callback_data.startswith('clan_join_'):
                cid = int(callback_data.split('_')[-1])
                await CallbackHandlers.clan_join(query, player, cid)
            elif callback_data == 'clan_leave':
                await CallbackHandlers.clan_leave(query, player)
            elif callback_data.startswith('clan_view_'):
                cid = int(callback_data.split('_')[-1])
                await CallbackHandlers.clan_view(query, cid)

            # Реферал inline
            # PvP очередь
            elif callback_data == 'pvp_cancel':
                await CallbackHandlers.pvp_cancel(query, player)
            elif callback_data == 'pvp_bot_fallback':
                await CallbackHandlers.pvp_bot_fallback(query, player)

            elif callback_data == 'show_invite':
                await CallbackHandlers.show_invite_inline(query, player, context)

            # Telegram Stars покупка
            elif callback_data == "stars_buy_premium":
                await CallbackHandlers.send_premium_invoice(query, player, context)
            elif callback_data.startswith("stars_buy_"):
                parts = callback_data.split("_")
                diamonds, stars = int(parts[2]), int(parts[3])
                await CallbackHandlers.send_stars_invoice(query, player, context, diamonds, stars)

            # Обработка тренировок
            elif callback_data.startswith('train_'):
                await CallbackHandlers.handle_training(query, player, callback_data.replace('train_', ''))

            # Обработка магазина
            elif callback_data.startswith('buy_'):
                await CallbackHandlers.handle_shop_purchase(query, player, callback_data.replace('buy_', ''))
            
            # Обработка боев
            elif callback_data == 'battle_opponent_stats':
                await CallbackHandlers.show_battle_opponent_stats(query, user.id)
            elif callback_data == 'battle_refresh':
                await CallbackHandlers.handle_battle_refresh(query, user.id)
            elif callback_data == 'battle_auto':
                await CallbackHandlers.handle_battle_auto(query, user.id)
            elif callback_data.startswith('attack_'):
                await CallbackHandlers.handle_battle_choice(query, user.id, callback_data)
            elif callback_data.startswith('defend_'):
                await CallbackHandlers.handle_battle_choice(query, user.id, callback_data)
            else:
                await CallbackHandlers._callback_set_message(query,"❌ Неизвестное действие")
                
        except BadRequest as e:
            if _telegram_message_unchanged(e):
                return
            logger.exception("BadRequest in callback handler")
            try:
                await CallbackHandlers._callback_set_message(query,"❌ Произошла ошибка. Попробуйте снова.")
            except Exception:
                pass
        except Exception as e:
            logger.exception("Error in callback handler: %s", e)
            try:
                await CallbackHandlers._callback_set_message(query,"❌ Произошла ошибка. Попробуйте снова.")
            except Exception:
                pass
    
    @staticmethod
    async def find_battle(query, player):
        """Найти бой"""
        if battle_system.get_battle_status(player['user_id']):
            await CallbackHandlers._callback_set_message(query,
                "⚠️ У вас уже идёт бой. Закончите его или сбросьте зависшее состояние.",
                reply_markup=CallbackHandlers._stale_battle_markup(),
                parse_mode='HTML',
            )
            return
        uid = player['user_id']
        un = query.from_user.username or ""
        player = db.get_or_create_player(uid, un)

        # Применяем реген HP с момента последнего действия
        endurance_inv = stamina_stats_invested(player.get('max_hp', PLAYER_START_MAX_HP), player.get('level', 1))
        regen_result = db.apply_hp_regen(uid, endurance_inv)
        if regen_result:
            player = dict(player)
            player['current_hp'] = regen_result['current_hp']

        # Проверка минимального HP для боя (30%)
        mh = int(player.get("max_hp", PLAYER_START_MAX_HP))
        ch = int(player.get("current_hp", mh))
        min_hp = int(mh * HP_MIN_BATTLE_PCT)
        if ch < min_hp:
            endurance_mult = 1.0 + endurance_inv * HP_REGEN_ENDURANCE_BONUS
            regen_per_sec = mh / HP_REGEN_BASE_SECONDS * endurance_mult
            hp_needed = min_hp - ch
            secs_needed = int(hp_needed / max(0.001, regen_per_sec))
            mins, secs = divmod(secs_needed, 60)
            time_str = f"{mins}м {secs}с" if mins else f"{secs}с"
            await CallbackHandlers._callback_set_message(query,
                f"⚠️ <b>Нужно восстановиться!</b>\n\n"
                f"❤️ HP: {ch}/{mh}  (нужно минимум {min_hp})\n"
                f"⏱ До боя: примерно {time_str}\n\n"
                f"💡 Вложи статы в <b>Выносливость</b> — чем больше, тем быстрее реген.",
                reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Назад", callback_data='back')]]),
                parse_mode='HTML',
            )
            return

        logger.info("event=battle_search user_id=%s level=%s", uid, player.get("level"))
        db.log_metric_event("battle_search", uid)

        # PvP: ищем живого соперника в очереди
        pvp_entry = db.pvp_find_opponent(uid, int(player.get("level", PLAYER_START_LEVEL)))
        if pvp_entry:
            opp_uid = pvp_entry["user_id"]
            db.pvp_dequeue(opp_uid)
            opp_player = db.get_or_create_player(opp_uid, "")

            battle_id = await battle_system.start_battle(player, opp_player, is_bot2=False)

            # Показываем бой текущему игроку (P1)
            packed = CallbackHandlers._battle_message_html_for_user(uid)
            if not packed:
                await CallbackHandlers._callback_set_message(query,"❌ Ошибка старта боя.")
                return
            text1, pa1, pd1 = packed
            chat_id, mid = await CallbackHandlers._callback_set_message(
                query,
                text1,
                reply_markup=CallbackHandlers._battle_inline_markup(pa1, pd1),
                parse_mode='HTML',
            )
            battle_system.set_battle_ui_message(uid, chat_id, mid)

            # Уведомляем P2 (ждавшего игрока) — правим его «waiting» сообщение
            opp_chat_id = pvp_entry["chat_id"]
            opp_msg_id = pvp_entry.get("message_id")
            if opp_msg_id:
                packed2 = CallbackHandlers._battle_message_html_for_user(opp_uid)
                if packed2:
                    text2, pa2, pd2 = packed2
                    try:
                        await query.get_bot().edit_message_text(
                            chat_id=opp_chat_id, message_id=opp_msg_id,
                            text=text2,
                            reply_markup=CallbackHandlers._battle_inline_markup(pa2, pd2),
                            parse_mode='HTML',
                        )
                        battle_system.set_battle_p2_ui_message(opp_uid, opp_chat_id, opp_msg_id)
                    except Exception as e:
                        logger.warning("PvP: не удалось уведомить P2 opp_uid=%s: %s", opp_uid, e)

            battle_system.schedule_turn_timer(battle_id)
            return

        # Живых соперников нет — встаём в очередь (waiting screen)
        chat_id, mid = await CallbackHandlers._callback_set_message(
            query,
            "⏳ <b>Поиск соперника...</b>\n\nИщем живого игрока вашего уровня.",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("❌ Отмена", callback_data='pvp_cancel')],
                [InlineKeyboardButton("🤖 Бой с ботом", callback_data='pvp_bot_fallback')],
            ]),
            parse_mode='HTML',
        )
        db.pvp_enqueue(uid, int(player.get("level", PLAYER_START_LEVEL)), chat_id, mid)

    @staticmethod
    async def _start_bot_battle(query, player):
        """Запустить бой с ботом (общая логика для find_battle и pvp_bot_fallback)."""
        uid = player['user_id']
        opponent = db.find_suitable_opponent(player["level"])
        if not opponent:
            await CallbackHandlers._callback_set_message(query,"😔 Не удалось найти противника. Попробуйте позже.")
            return

        completed_before = player.get("wins", 0) + player.get("losses", 0)
        if completed_before < ONBOARDING_BATTLES_EASY:
            opponent = battle_system.apply_onboarding_bot(opponent)

        battle_id = await battle_system.start_battle(player, opponent, is_bot2=True)
        b = battle_system.active_battles.get(battle_id)
        if b and completed_before < ONBOARDING_BATTLES_EASY:
            n = completed_before + 1
            b['ui_message_prefix'] = (
                f"🎓 <b>Тренировка:</b> лёгкий противник "
                f"({n}/{ONBOARDING_BATTLES_EASY}). Дальше — обычная сложность ботов.\n\n"
            )
        packed = CallbackHandlers._battle_message_html_for_user(uid)
        if not packed:
            await CallbackHandlers._callback_set_message(query,"❌ Ошибка старта боя.")
            return
        battle_ui, pa, pd = packed
        chat_id, mid = await CallbackHandlers._callback_set_message(
            query,
            battle_ui,
            reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
            parse_mode='HTML',
        )
        battle_system.set_battle_ui_message(uid, chat_id, mid)
        battle_system.schedule_turn_timer(battle_id)

    @staticmethod
    async def pvp_cancel(query, player):
        """Отмена поиска PvP — выходим из очереди."""
        db.pvp_dequeue(player['user_id'])
        player = db.get_or_create_player(player['user_id'], query.from_user.username or "")
        await CallbackHandlers._callback_set_message(query,
            CallbackHandlers._welcome_html(player, player.get('username') or ""),
            reply_markup=CallbackHandlers._main_menu_markup(),
            parse_mode='HTML',
        )

    @staticmethod
    async def pvp_bot_fallback(query, player):
        """Устали ждать — выйти из очереди и начать бой с ботом."""
        db.pvp_dequeue(player['user_id'])
        # Проверяем HP снова (мог измениться пока ждали)
        uid = player['user_id']
        un = query.from_user.username or ""
        player = db.get_or_create_player(uid, un)
        endurance_inv = stamina_stats_invested(player.get('max_hp', PLAYER_START_MAX_HP), player.get('level', 1))
        regen_result = db.apply_hp_regen(uid, endurance_inv)
        if regen_result:
            player = dict(player)
            player['current_hp'] = regen_result['current_hp']
        await CallbackHandlers._start_bot_battle(query, player)

    @staticmethod
    async def handle_battle_abandon(query, player):
        """Сброс зависшего боя без записи в статистику."""
        if battle_system.force_abandon_battle(player['user_id']):
            await CallbackHandlers._callback_set_message(query,
                "🧹 Бой сброшен (без записи в статистику). Можно начать заново.",
                reply_markup=CallbackHandlers._main_menu_markup(),
                parse_mode='HTML',
            )
        else:
            await CallbackHandlers._callback_set_message(query,
                "Активного боя в памяти нет. Главное меню:",
                reply_markup=CallbackHandlers._main_menu_markup(),
                parse_mode='HTML',
            )

    @staticmethod
    async def _resolve_stale_battle_message(query, user_id: int) -> None:
        """Нет активного боя в памяти: показать сохранённый итог (vs бот) или главное меню."""
        snap = battle_system.peek_battle_end_ui(user_id)
        if snap:
            player = db.get_or_create_player(user_id, query.from_user.username or "")
            adapted = CallbackHandlers._adapt_result_for_user(snap, user_id)
            delivered = await CallbackHandlers._show_battle_end(query, player, adapted)
            if not delivered:
                delivered = await CallbackHandlers._deliver_battle_end_chat(
                    query.get_bot(), query.from_user.id, player, adapted,
                )
            if delivered:
                battle_system.clear_battle_end_ui(user_id)
            await query.answer()
            return
        player = db.get_or_create_player(user_id, query.from_user.username or "")
        await CallbackHandlers._send_profile_card(
            query, player, player.get('username') or "",
            CallbackHandlers._main_menu_markup(),
            extra_text="⚠️ Бой уже завершён или устарел.",
        )
        await query.answer()

    @staticmethod
    def _adapt_result_for_user(result: dict, user_id: int) -> dict:
        """Вернуть копию round_result с перспективой user_id (нужно для P2 в PvP)."""
        winner_id = result.get('winner_id')
        if winner_id is None:
            return result
        p1_uid = result.get('pvp_p1_user_id')
        if p1_uid is not None and user_id == p1_uid:
            return result  # уже P1-перспектива
        # user_id — P2, инвертируем
        r = dict(result)
        r['human_won'] = (winner_id == user_id)
        r['damage_to_opponent'] = result.get('damage_to_you')
        r['damage_to_you'] = result.get('damage_to_opponent')
        r['gold_reward'] = result.get('p2_gold_reward', 0)
        r['exp_reward'] = result.get('p2_exp_reward', 0)
        r['xp_boosted'] = result.get('p2_xp_boosted', False)
        r['streak_bonus_gold'] = result.get('p2_streak_bonus_gold', 0)
        r['win_streak'] = result.get('p2_win_streak', 0)
        r['level_up'] = result.get('p2_level_up', False)
        r['level_up_level'] = result.get('p2_level_up_level', None)
        return r

    @staticmethod
    async def _pvp_push_other(bot, triggering_uid: int, round_result: dict) -> None:
        """В PvP — отправить обновление другому игроку (не тому, кто вызвал)."""
        status = round_result.get('status')
        if status == 'round_completed':
            bid = battle_system.battle_queue.get(triggering_uid)
            if not bid:
                return
            battle = battle_system.active_battles.get(bid)
            if not battle or battle.get('is_bot2'):
                return
            p1_uid = battle['player1']['user_id']
            p2_uid = battle['player2'].get('user_id')
            if triggering_uid == p1_uid:
                other_uid, other_um = p2_uid, battle.get('ui_message_p2')
            else:
                other_uid, other_um = p1_uid, battle.get('ui_message')
            if not other_uid or not other_um:
                return
            packed = CallbackHandlers._battle_message_html_for_user(other_uid)
            if not packed:
                return
            text, pa, pd = packed
            await tg_api_call(
                bot.edit_message_text,
                chat_id=other_um['chat_id'], message_id=other_um['message_id'],
                text=text, reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
                parse_mode='HTML',
            )
        elif status in ('battle_ended', 'battle_ended_afk'):
            p2_uid = round_result.get('pvp_p2_user_id')
            um_p2 = round_result.get('pvp_p2_ui_message')
            p1_uid = round_result.get('pvp_p1_user_id')
            um_p1 = round_result.get('pvp_p1_ui_message')
            # определяем «другого» игрока
            if triggering_uid == p1_uid:
                other_uid, other_um = p2_uid, um_p2
            elif triggering_uid == p2_uid:
                other_uid, other_um = p1_uid, um_p1
            else:
                return
            if not other_uid or not other_um:
                return
            other_player = db.get_or_create_player(other_uid, "")
            adapted = CallbackHandlers._adapt_result_for_user(round_result, other_uid)
            delivered = await CallbackHandlers._show_battle_end(
                None, other_player, adapted,
                is_bot_target=True, bot=bot,
                chat_id=other_um['chat_id'], message_id=other_um['message_id'],
            )
            if delivered:
                battle_system.clear_battle_end_ui(other_uid)
            notify_chat = db.get_player_chat_id(other_uid) or other_um['chat_id']
            await CallbackHandlers._notify_level_up_chat(bot, notify_chat, other_uid, adapted)

    @staticmethod
    def _battle_end_stats_html(round_result: dict) -> str:
        """Суммарный урон за бой (игрок — player1, как в бою с ботом)."""
        d_opp = round_result.get('damage_to_opponent')
        d_you = round_result.get('damage_to_you')
        if d_opp is None or d_you is None:
            return ''
        rnd = int(round_result.get('rounds') or 0)
        return (
            f"\n\n📊 <b>Итог размена</b>\n"
            f"• Урон по врагу: <b>{d_opp}</b> HP\n"
            f"• По вам: <b>{d_you}</b> HP\n"
            f"• Раундов: {rnd}"
        )

    @staticmethod
    def _battle_end_summary(player: dict, round_result: dict) -> str:
        """Краткий итог боя (caption для карточки профиля)."""
        stats = CallbackHandlers._battle_end_stats_html(round_result)
        if round_result.get('is_test_battle'):
            rnd = int(round_result.get('rounds') or 0)
            if round_result.get('human_won'):
                s = "🏁 <b>Победа</b> в тестовом бою. Награды не изменились."
            else:
                s = "💀 <b>Поражение</b> в тестовом бою. Награды не изменились."
            if not stats:
                s += f" Раундов: {rnd}."
            return s + stats
        if round_result.get('human_won'):
            gb   = round_result.get('gold_reward', 0)
            expb = round_result.get('exp_reward', 0)
            sb   = round_result.get('streak_bonus_gold', 0)
            ws   = round_result.get('win_streak', 0)
            s = f"🏁 <b>Победа!</b>  +{gb} 💰"
            if round_result.get('xp_boosted'):
                s += f"  +{expb} ⭐ (XP-буст!)"
            else:
                s += f"  +{expb} ⭐"
            if sb:
                s += f"\n🔥 Серия {ws} побед! +{sb} 💰 бонус"
            total_battles = player.get('wins', 0) + player.get('losses', 0)
            if total_battles == 1:
                s += "\n\n💡 Вложи статы: Сила→урон, Ловкость→уворот, Выносливость→броня"
            elif total_battles == 3:
                s += "\n\n💡 Купи ❤️ Зелье HP в магазине за 30 💰"
            elif total_battles == 5:
                s += "\n\n💡 Ежедневные квесты /quests — 40 💰 и 1 💎 в день!"
        else:
            s = "💀 <b>Поражение.</b>  Наград нет."
            total_battles = player.get('wins', 0) + player.get('losses', 0)
            if total_battles <= 5:
                s += "  Атакуй и защищай ТУЛОВИЩЕ — самая большая зона."
        return s + stats

    @staticmethod
    def _battle_end_message_with_welcome(player: dict, round_result: dict) -> str:
        """Итог боя + главный экран (используется как fallback если фото не работает)."""
        summary = CallbackHandlers._battle_end_summary(player, round_result)
        welcome = CallbackHandlers._welcome_html(player, player.get('username') or "")
        return f"{summary}\n\n{welcome}"

    @staticmethod
    async def _deliver_battle_end_chat(bot, chat_id: int, player: dict, round_result: dict) -> bool:
        """Новое сообщение с итогом боя (старое сообщение недоступно для правки)."""
        summary = CallbackHandlers._battle_end_summary(player, round_result)
        markup = CallbackHandlers._main_menu_markup()
        img_bytes = generate_profile_card(player)
        try:
            await tg_api_call(
                bot.send_photo,
                chat_id=chat_id,
                photo=img_bytes,
                caption=summary,
                reply_markup=markup,
                parse_mode='HTML',
            )
            return True
        except Exception as e:
            logger.warning("_deliver_battle_end_chat: photo failed: %s", e)
        try:
            text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
            await tg_api_call(
                bot.send_message,
                chat_id=chat_id,
                text=text,
                reply_markup=markup,
                parse_mode='HTML',
            )
            return True
        except Exception as e:
            logger.warning("_deliver_battle_end_chat: message failed: %s", e)
        return False

    @staticmethod
    async def _show_battle_end(target, player: dict, round_result: dict, *, is_bot_target=False, bot=None, chat_id=None, message_id=None) -> bool:
        """
        Показать итог боя как карточку профиля.
        target=query (callback) или None (тогда нужны bot/chat_id/message_id для job).
        is_bot_target=True: вызов из asyncio-таймера, target=None.
        Возвращает True, если итог, скорее всего, доставлен.
        """
        from telegram import InputMediaPhoto

        summary = CallbackHandlers._battle_end_summary(player, round_result)
        markup = CallbackHandlers._main_menu_markup()
        img_bytes = generate_profile_card(player)

        if is_bot_target:
            try:
                media = InputMediaPhoto(media=img_bytes, caption=summary, parse_mode='HTML')
                await tg_api_call(
                    bot.edit_message_media,
                    chat_id=chat_id,
                    message_id=message_id,
                    media=media,
                    reply_markup=markup,
                )
                return True
            except Exception:
                pass
            try:
                text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
                await tg_api_call(
                    bot.edit_message_text,
                    chat_id=chat_id,
                    message_id=message_id,
                    text=text,
                    reply_markup=markup,
                    parse_mode='HTML',
                )
                return True
            except Exception:
                pass
            return await CallbackHandlers._deliver_battle_end_chat(bot, chat_id, player, round_result)

        # Callback query
        msg = target.message if target else None
        if msg and msg.photo:
            try:
                media = InputMediaPhoto(media=img_bytes, caption=summary, parse_mode='HTML')
                await tg_api_call(target.edit_message_media, media=media, reply_markup=markup)
                return True
            except Exception:
                pass
        try:
            if msg:
                try:
                    await msg.delete()
                except Exception:
                    pass
            tg_chat_id = msg.chat_id if msg else target.from_user.id
            bot_obj = target.get_bot()
            await tg_api_call(
                bot_obj.send_photo,
                chat_id=tg_chat_id,
                photo=img_bytes,
                caption=summary,
                reply_markup=markup,
                parse_mode='HTML',
            )
            return True
        except Exception as e:
            logger.warning("_show_battle_end: send_photo failed, text fallback: %s", e)
        text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
        try:
            await tg_api_call(target.edit_message_text, text, reply_markup=markup, parse_mode='HTML')
            return True
        except Exception:
            return await CallbackHandlers._deliver_battle_end_chat(target.get_bot(), target.from_user.id, player, round_result)

    @staticmethod
    async def _notify_level_up_chat(bot, chat_id: int, user_id: int, round_result: dict):
        """Отдельное сообщение в чат при апе уровня победителем (тот же chat_id, что и бой)."""
        lvl = round_result.get('level_up_level')
        if not lvl or round_result.get('is_test_battle'):
            return
        if round_result.get('winner_id') != user_id:
            return
        pl = db.get_or_create_player(user_id, "")
        name = html_escape((pl.get('username') or '').strip() or 'Игрок')
        await tg_api_call(
            bot.send_message,
            chat_id=chat_id,
            text=f"🎉 {name} достиг {int(lvl)} уровня!",
            parse_mode='HTML',
        )

    @staticmethod
    async def dispatch_round_result_from_job(bot, chat_id: int, message_id: int, user_id: int, round_result: dict):
        """Обновление сообщения боя после таймаута хода (asyncio)."""
        if round_result.get('status') == 'round_completed':
            packed = CallbackHandlers._battle_message_html_for_user(user_id)
            if packed:
                text, pa, pd = packed
                markup = CallbackHandlers._battle_inline_markup(pa, pd)
            else:
                ex = round_result.get('exchange_text') or ''
                clog = round_result.get('combat_log_html') or ''
                ctx = battle_system.get_battle_ui_context(user_id)
                parts = []
                if clog:
                    parts.append(f"📜 <b>Лог боя</b>\n{clog}")
                elif ex:
                    parts.append(ex)
                if ctx:
                    parts.append(CallbackHandlers._build_battle_screen_html(ctx))
                else:
                    parts.append(
                        f"❤️ вы {round_result['player1_hp']} · "
                        f"враг {round_result['player2_hp']}"
                    )
                text = "\n\n".join(parts)
                markup = CallbackHandlers._battle_inline_markup()
            try:
                await tg_api_call(
                    bot.edit_message_text,
                    chat_id=chat_id,
                    message_id=message_id,
                    text=text,
                    reply_markup=markup,
                    parse_mode='HTML',
                )
            except Exception as e:
                logger.warning(
                    "dispatch_round_from_job: edit round uid=%s mid=%s: %s — шлём новое сообщение",
                    user_id,
                    message_id,
                    e,
                )
                try:
                    sent = await tg_api_call(
                        bot.send_message,
                        chat_id=chat_id,
                        text=text,
                        reply_markup=markup,
                        parse_mode='HTML',
                    )
                    battle_system.set_battle_ui_message(user_id, sent.chat_id, sent.message_id)
                except Exception as e2:
                    logger.warning("dispatch_round_from_job: send_message failed uid=%s: %s", user_id, e2)
            return
        if round_result.get('status') in ('battle_ended', 'battle_ended_afk'):
            player = db.get_or_create_player(user_id, "")
            adapted = CallbackHandlers._adapt_result_for_user(round_result, user_id)
            delivered = await CallbackHandlers._show_battle_end(
                None, player, adapted,
                is_bot_target=True, bot=bot,
                chat_id=chat_id, message_id=message_id,
            )
            if delivered:
                battle_system.clear_battle_end_ui(user_id)
            else:
                logger.warning(
                    "dispatch_round_from_job: итог боя не доставлен в чат uid=%s — остаётся буфер для «Обновить»",
                    user_id,
                )
            notify_chat = db.get_player_chat_id(user_id) or chat_id
            await CallbackHandlers._notify_level_up_chat(bot, notify_chat, user_id, adapted)
            return

    @staticmethod
    async def _handle_round_submitted(query, user_id, round_result):
        """Результат make_choice: раунд, конец боя или ожидание соперника (PvP)."""
        if round_result.get('status') == 'duplicate_choice':
            await query.answer("⛔ Ход уже засчитан.", show_alert=False)
            return
        if round_result.get('status') == 'round_completed':
            packed = CallbackHandlers._battle_message_html_for_user(user_id)
            if packed:
                text, pa, pd = packed
                chat_id, mid = await CallbackHandlers._callback_set_message(
                    query,
                    text,
                    reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
                    parse_mode='HTML',
                )
                CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
                # PvP: обновить сообщение второго игрока
                await CallbackHandlers._pvp_push_other(query.get_bot(), user_id, round_result)
                await query.answer()
                return
            ex = round_result.get('exchange_text') or ''
            clog = round_result.get('combat_log_html') or ''
            ctx = battle_system.get_battle_ui_context(user_id)
            parts = []
            if clog:
                parts.append(f"📜 <b>Лог боя</b>\n{clog}")
            elif ex:
                parts.append(ex)
            if ctx:
                parts.append(CallbackHandlers._build_battle_screen_html(ctx))
            else:
                parts.append(
                    f"❤️ вы {round_result['player1_hp']} · "
                    f"враг {round_result['player2_hp']}"
                )
            text = "\n\n".join(parts)
            chat_id, mid = await CallbackHandlers._callback_set_message(
                query,
                text,
                reply_markup=CallbackHandlers._battle_inline_markup(),
                parse_mode='HTML',
            )
            CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
            await CallbackHandlers._pvp_push_other(query.get_bot(), user_id, round_result)
            await query.answer()
            return
        if round_result.get('status') in ('battle_ended', 'battle_ended_afk'):
            player = db.get_or_create_player(user_id, query.from_user.username or "")
            adapted = CallbackHandlers._adapt_result_for_user(round_result, user_id)
            delivered = await CallbackHandlers._show_battle_end(query, player, adapted)
            if delivered:
                battle_system.clear_battle_end_ui(user_id)
            if query.message:
                await CallbackHandlers._notify_level_up_chat(
                    query.get_bot(), query.message.chat_id, user_id, adapted,
                )
            # PvP: показать итог второму игроку
            await CallbackHandlers._pvp_push_other(query.get_bot(), user_id, round_result)
            await query.answer()
            return
        if round_result.get('status') == 'choice_made':
            ctx = battle_system.get_battle_ui_context(user_id)
            if ctx:
                text = CallbackHandlers._build_battle_screen_html(ctx)
                chat_id, mid = await CallbackHandlers._callback_set_message(
                    query,
                    text,
                    reply_markup=CallbackHandlers._battle_inline_markup(),
                    parse_mode='HTML',
                )
                CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
            await query.answer()
            return
        await query.answer()

    @staticmethod
    async def show_battle_opponent_stats(query, user_id):
        """Всплывающее окно со статами соперника — сообщение боя не трогаем."""
        ctx = battle_system.get_battle_ui_context(user_id)
        if not ctx:
            await query.answer("Бой не найден или уже завершён.", show_alert=False)
            return
        nm = str(ctx.get("opponent_name") or "Соперник")
        if len(nm) > 18:
            nm = nm[:15] + "…"

        lv   = int(ctx['opponent_level'])
        s    = int(ctx['opp_strength'])
        agi  = int(ctx['opp_endurance'])
        intu = int(ctx['opp_crit'])
        vyn  = int(ctx.get('opp_stamina_invested', 0))
        mhp  = int(ctx.get('opp_max_hp', ctx['opp_max']))
        chp  = int(ctx['opp_hp'])

        # % характеристики (против среднего игрока того же уровня)
        tf = total_free_stats_at_level(lv)
        avg_agi  = max(1, PLAYER_START_ENDURANCE + tf // 4)
        avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
        dodge_p  = int(min(DODGE_MAX_CHANCE, agi  / (agi  + avg_agi)  * DODGE_MAX_CHANCE) * 100)
        crit_p   = int(min(CRIT_MAX_CHANCE,  intu / (intu + avg_intu) * CRIT_MAX_CHANCE)  * 100)
        armor_p  = int(min(ARMOR_ABSOLUTE_MAX,
                           vyn / (vyn + ARMOR_STAMINA_K_ABS)) * 100) if vyn > 0 else 0
        dmg      = int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER))

        txt = (
            f"{nm} · ур.{lv} · 🏆{ctx['opp_rating']}\n"
            f"💪 {s}  🛡 -{armor_p}%\n"
            f"🤸 {agi}  💥 {intu}\n"
            f"❤️ {chp}/{mhp} HP  ·  вын: {vyn}"
        )
        if len(txt) > 195:
            txt = txt[:192] + "…"
        await query.answer(txt, show_alert=True)

    @staticmethod
    async def handle_battle_refresh(query, user_id):
        """Перерисовать сообщение боя из актуального состояния (таймер, HP, лог)."""
        async with _battle_turn_lock(user_id):
            packed = CallbackHandlers._battle_message_html_for_user(user_id)
            if not packed:
                await CallbackHandlers._resolve_stale_battle_message(query, user_id)
                return
            text, pa, pd = packed
            chat_id, mid = await CallbackHandlers._callback_set_message(
                query,
                text,
                reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
                parse_mode='HTML',
            )
            CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
            await query.answer()

    @staticmethod
    async def handle_battle_auto(query, user_id):
        """Случайный полный ход."""
        async with _battle_turn_lock(user_id):
            if not battle_system.get_battle_status(user_id):
                await CallbackHandlers._resolve_stale_battle_message(query, user_id)
                return
            try:
                result = await battle_system.submit_auto_round(user_id)
                if 'error' in result:
                    await query.answer(result['error'], show_alert=True)
                    return
                await CallbackHandlers._handle_round_submitted(query, user_id, result)
            except Exception as e:
                logger.error(f"Error in battle auto: {e}")
                await CallbackHandlers._callback_set_message(query, "❌ Ошибка в бою")
                await query.answer()

    @staticmethod
    async def handle_battle_choice(query, user_id, callback_data):
        """Обработать выбор в бою"""
        async with _battle_turn_lock(user_id):
            choice_type, zone = callback_data.split('_', 1)
            if choice_type == 'defend':
                choice_type = 'defense'

            battle_status = battle_system.get_battle_status(user_id)
            if not battle_status:
                await CallbackHandlers._resolve_stale_battle_message(query, user_id)
                return

            try:
                result = await battle_system.submit_zone_choice(user_id, choice_type, zone)

                if result.get('status') == 'duplicate_component':
                    await query.answer("⛔ Уже выбрано в этом раунде.", show_alert=False)
                    return

                if result.get('status') == 'partial_choice_saved':
                    packed = CallbackHandlers._battle_message_html_for_user(user_id)
                    if packed:
                        text, pa, pd = packed
                        chat_id, mid = await CallbackHandlers._callback_set_message(
                            query,
                            text,
                            reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
                            parse_mode='HTML',
                        )
                        CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
                    await query.answer()
                    return

                if result.get('status') == 'choices_submitted':
                    await CallbackHandlers._handle_round_submitted(
                        query, user_id, result.get('result', {})
                    )
                    return

                if 'error' in result:
                    await CallbackHandlers._callback_set_message(query, f"❌ {result['error']}")
                    await query.answer()
                    return

                await query.answer()

            except Exception as e:
                logger.error(f"Error in battle choice: {e}")
                await CallbackHandlers._callback_set_message(query, "❌ Ошибка в бою")
                await query.answer()
    
    @staticmethod
    async def show_training(query, player):
        """Экран распределения статов (меню «Статы»)."""
        free_stats = player.get('free_stats', 0)
        
        vyn_inv = stamina_stats_invested(player['max_hp'], player['level'])
        combat_summary = CallbackHandlers._combat_stats_summary(player)
        training_text = (
            f"📊 <b>СТАТЫ</b>\n\n"
            f"🔢 <b>Свободных статов:</b> {free_stats}\n\n"
            f"💪 <b>Сила:</b> {player['strength']}\n"
            f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
            f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n"
            f"❤️ <b>Выносливость:</b> {vyn_inv} вложено · "
            f"{player['current_hp']}/{player['max_hp']} HP\n\n"
            f"<b>— В бою —</b>\n"
            f"{combat_summary}\n\n"
            f"💰 <b>Улучшения за золото:</b>\n"
            f"Сила атаки: от 1000 · Уклонение: от 1500\n"
            f"Блоки: от 1200 · Криты: от 2000"
        )
        
        keyboard = []
        
        if free_stats > 0:
            keyboard.extend([
                [InlineKeyboardButton(f"💪 +1 Сила ({free_stats} доступно)", callback_data='train_strength')],
                [InlineKeyboardButton(f"🤸 +1 Ловкость ({free_stats} доступно)", callback_data='train_endurance')],
                [InlineKeyboardButton(f"💥 +1 Интуиция ({free_stats} доступно)", callback_data='train_crit_stat')],
                [InlineKeyboardButton(f"❤️ +{STAMINA_PER_FREE_STAT} выносливости ({free_stats} доступно)", callback_data='train_hp')]
            ])
        
        keyboard.extend([
            [InlineKeyboardButton("⚔️ Улучшить силу атаки", callback_data='train_attack_power')],
            [InlineKeyboardButton("🏃 Улучшить уклонение", callback_data='train_dodge')],
            [InlineKeyboardButton("🛡️ Улучшить блоки", callback_data='train_block')],
            [InlineKeyboardButton("⚡ Улучшить криты", callback_data='train_critical')],
            [InlineKeyboardButton("⬅️ Назад", callback_data='back')]
        ])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        await CallbackHandlers._callback_set_message(query,training_text, reply_markup=reply_markup, parse_mode='HTML')
    
    @staticmethod
    async def handle_training(query, player, training_type):
        """Обработать тренировку"""
        free_stats = player.get('free_stats', 0)
        
        if training_type in ['strength', 'endurance', 'hp', 'crit_stat']:
            if free_stats <= 0:
                await query.answer("❌ Нет свободных статов!")
                return
            
            stats_update = {}
            
            if training_type == 'strength':
                stats_update = {'strength': player['strength'] + 1}
                message = "💪 Сила увеличена на +1!"
            elif training_type == 'endurance':
                stats_update = {'endurance': player['endurance'] + 1}
                message = "🤸 Ловкость увеличена на +1!"
            elif training_type == 'crit_stat':
                stats_update = {'crit': player.get('crit', PLAYER_START_CRIT) + 1}
                message = "💥 Крит увеличен на +1!"
            elif training_type == 'hp':
                inc = STAMINA_PER_FREE_STAT
                stats_update = {
                    'max_hp': player['max_hp'] + inc,
                    'current_hp': player['current_hp'] + inc,
                }
                message = f"❤️ Выносливость увеличена: +{inc} к пулу!"
            
            stats_update['free_stats'] = free_stats - 1
            db.update_player_stats(player['user_id'], stats_update)
            
            await query.answer(message)
            await CallbackHandlers.show_training(query, db.get_or_create_player(player['user_id'], player['username']))
        
        else:
            # Улучшения за золото (callback train_block -> block -> block_mastery в БД)
            type_map = {
                'block': 'block_mastery',
                'critical': 'critical_strike',
            }
            imp_key = type_map.get(training_type, training_type)

            improvement_costs = {
                'attack_power': 1000,
                'dodge': 1500,
                'block_mastery': 1200,
                'critical_strike': 2000,
            }
            
            cost = improvement_costs.get(imp_key, 1000)
            
            if player['gold'] < cost:
                await query.answer(f"❌ Недостаточно золота! Нужно: {cost}")
                return
            
            success = db.upgrade_improvement(player['user_id'], imp_key)
            
            if success:
                await query.answer("✅ Улучшение куплено!")
                await CallbackHandlers.show_training(query, db.get_or_create_player(player['user_id'], player['username']))
            else:
                await query.answer("❌ Не удалось улучшить (максимальный уровень?)")
    
    @staticmethod
    async def show_rating(query, player):
        """Показать рейтинг"""
        top_players = db.get_top_players(10)
        
        rating_text = '🏆 **Топ-10 бойцов Арены**\n\n'
        
        for i, p in enumerate(top_players, 1):
            medal = '🥇' if i == 1 else '🥈' if i == 2 else '🥉' if i == 3 else f'{i}.'
            win_rate = p['wins'] / (p['wins'] + p['losses']) * 100 if (p['wins'] + p['losses']) > 0 else 0
            
            rating_text += f'{medal} {p["username"]}\n'
            rating_text += f'   📊 Ур.{p["level"]} | 🏆 {p["rating"]} | 🔥 {p["wins"]} побед | 📈 {win_rate:.1f}%\n\n'
        
        keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data='back')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await CallbackHandlers._callback_set_message(query,rating_text, reply_markup=reply_markup)
    
    @staticmethod
    async def show_shop(query, player):
        """Показать магазин — только рабочие товары."""
        boost_charges = player.get('xp_boost_charges', 0) or 0
        text = (
            f"🛍️ <b>МАГАЗИН</b>\n\n"
            f"💰 Золото: <b>{player['gold']}</b>  |  💎 Алмазы: <b>{player['diamonds']}</b>\n\n"
            f"<b>🧪 Расходники (работают прямо сейчас):</b>\n"
            f"• ❤️ Зелье HP — полное восстановление HP · <b>30 золота</b>\n"
            f"• ⭐ XP-буст +50% на 5 боёв · <b>100 золота</b>"
            f" (у вас: {boost_charges} зарядов)\n\n"
            f"<b>💎 Премиум:</b>\n"
            f"• 🔄 Сброс характеристик · <b>{RESET_STATS_COST_DIAMONDS} алмазов</b>\n"
            f"• 💎 Купить алмазы / Premium → /buy\n\n"
            f"<i>Оружие и броня — в разработке</i>"
        )
        from config import PREMIUM_SUBSCRIPTION_STARS

        keyboard = [
            [
                InlineKeyboardButton("❤️ Зелье HP · 30", callback_data='buy_hp_potion'),
                InlineKeyboardButton("⭐ XP буст · 100", callback_data='buy_xp_boost'),
            ],
            [InlineKeyboardButton("🔄 Сброс статов · 50💎", callback_data='buy_stat_reset')],
            [
                InlineKeyboardButton(
                    f"👑 Premium · {PREMIUM_SUBSCRIPTION_STARS}⭐",
                    callback_data="stars_buy_premium",
                )
            ],
            [InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')],
        ]
        await CallbackHandlers._callback_set_message(query,text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    @staticmethod
    async def show_shop_category(query, player, category: str):
        """Редиректим в общий магазин — категории пока не разделены."""
        await CallbackHandlers.show_shop(query, player)

    @staticmethod
    async def handle_shop_purchase(query, player, item_key: str):
        """Обработка покупок из магазина."""
        uid = player['user_id']
        ref_r: dict = {}
        purchase_ok = False
        if item_key == 'hp_potion':
            result = db.buy_hp_potion(uid)
            if result['ok']:
                purchase_ok = True
                hp_r = result['hp_restored']
                msg = f"✅ HP восстановлен! +{hp_r} HP (−30 золота)" if hp_r > 0 else "❤️ HP уже полный! −30 золота"
                ref_r = db.process_referral_vip_shop_purchase(uid, gold=30)
            else:
                msg = f"❌ {result['reason']}"
        elif item_key == 'xp_boost':
            result = db.buy_xp_boost(uid)
            msg = f"✅ XP-буст: +5 зарядов куплено! (−100 золота)" if result['ok'] else f"❌ {result['reason']}"
            if result.get("ok"):
                purchase_ok = True
                ref_r = db.process_referral_vip_shop_purchase(uid, gold=100)
        elif item_key == 'stat_reset':
            result = db.buy_stat_reset(uid)
            msg = (
                f"✅ Статы сброшены! {result['free_stats']} свободных очков для распределения."
                if result['ok'] else f"❌ {result['reason']}"
            )
            if result.get("ok"):
                purchase_ok = True
                ref_r = db.process_referral_vip_shop_purchase(uid, diamonds=RESET_STATS_COST_DIAMONDS)
        else:
            msg = "❌ Товар не найден"
        await query.answer(msg, show_alert=True)
        if purchase_ok:
            await BotHandlers.notify_referrer_gold_shop(query.get_bot(), uid, item_key, ref_r)
        fresh_player = db.get_or_create_player(uid, player.get('username', ''))
        await CallbackHandlers.show_shop(query, fresh_player)
    
    @staticmethod
    async def show_stats(query, player):
        """Показать статистику"""
        improvements = db.get_player_improvements(player['user_id'])
        
        un = html_escape(player.get('username') or "")
        stats_text = (
            f"📈 <b>Подробная статистика</b>\n\n"
            f"👤 <b>Имя:</b> {un}\n"
            f"📊 <b>Уровень:</b> {player['level']}\n"
            f"⭐ <b>Опыт:</b> {format_exp_progress(player['exp'], player['level'])}\n"
            f"🏆 <b>Рейтинг:</b> {player['rating']}\n\n"
            f"❤️ <b>Выносливость:</b> {stamina_stats_invested(player['max_hp'], player['level'])} "
            f"{player['current_hp']}/{player['max_hp']}\n"
            f"💪 <b>Сила:</b> {player['strength']}\n"
            f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
            f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n\n"
            f"💰 <b>Золото:</b> {player['gold']}\n"
            f"💎 <b>Алмазы:</b> {player['diamonds']}\n\n"
            f"🔥 <b>Побед:</b> {player['wins']}\n"
            f"💔 <b>Поражений:</b> {player['losses']}\n\n"
            f"🌟 <b>Улучшения:</b>\n"
            f"⚔️ Сила атаки: {improvements.get('attack_power', 0)}/5\n"
            f"🏃 Уклонение: {improvements.get('dodge', 0)}/5\n"
            f"🛡️ Блоки: {improvements.get('block_mastery', 0)}/5\n"
            f"⚡ Криты: {improvements.get('critical_strike', 0)}/5"
        )
        
        keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data='back')]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await CallbackHandlers._callback_set_message(query,stats_text, reply_markup=reply_markup, parse_mode='HTML')
    
    # ------------------------------------------------------------------
    # Сезон
    # ------------------------------------------------------------------

    @staticmethod
    async def show_season_info(query, player):
        season = db.get_active_season()
        if not season:
            await CallbackHandlers._callback_set_message(query,"Сезон не активен.", reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')]]))
            return
        lb = db.get_season_leaderboard(season["id"], 5)
        started = str(season["started_at"])[:10]
        text = f"🌟 <b>{html_escape(season['name'])}</b>\n📅 Начало: {started}\n\n🏆 <b>Топ-5 сезона:</b>\n"
        for i, p in enumerate(lb, 1):
            medal = "🥇🥈🥉"[i - 1] if i <= 3 else f"{i}."
            un = html_escape(p.get("username") or "—")
            text += f"{medal} {un} — {p['wins']}W / {p['losses']}L · {p['rating']}⭐\n"
        if not lb:
            text += "Пока никто не сыграл в этом сезоне.\n"
        text += f"\n💡 За топ-3 в конце сезона: 100/50/25 💎"
        keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')]]
        await CallbackHandlers._callback_set_message(query,text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    # ------------------------------------------------------------------
    # Battle Pass
    # ------------------------------------------------------------------

    @staticmethod
    async def show_battle_pass(query, player):
        uid = player['user_id']
        bp = db.get_battle_pass(uid)
        tiers = db.BATTLE_PASS_TIERS
        claimed = bp.get('last_claimed_tier', 0)
        text = "🎖️ <b>BATTLE PASS</b>\n\nВыполняй задания — получай награды!\n\n"
        keyboard = []
        for i, (b_need, w_need, d, g) in enumerate(tiers, 1):
            b_done = min(bp.get('battles_done', 0), b_need)
            w_done = min(bp.get('wins_done', 0), w_need)
            if i <= claimed:
                status = "✅"
            elif b_done >= b_need and w_done >= w_need:
                status = "🎁 ГОТОВО"
            else:
                status = f"⏳ {b_done}/{b_need}б · {w_done}/{w_need}п"
            text += f"<b>Тир {i}</b> {status}\n  {b_need} боёв + {w_need} побед → +{d}💎 +{g}💰\n\n"
            if i > claimed and b_done >= b_need and w_done >= w_need:
                keyboard.append([InlineKeyboardButton(f"🎁 Забрать Тир {i}", callback_data=f'bp_claim_{i}')])
        keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')])
        await CallbackHandlers._callback_set_message(query,text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    @staticmethod
    async def claim_battle_pass_tier(query, player, tier: int):
        result = db.claim_battle_pass_tier(player['user_id'], tier)
        if result['ok']:
            await query.answer(f"✅ Тир {tier} получен! +{result['diamonds']}💎 +{result['gold']}💰", show_alert=True)
        else:
            await query.answer(f"❌ {result['reason']}", show_alert=True)
        fresh = db.get_or_create_player(player['user_id'], player.get('username', ''))
        await CallbackHandlers.show_battle_pass(query, fresh)

    # ------------------------------------------------------------------
    # Кланы
    # ------------------------------------------------------------------

    @staticmethod
    async def show_clan_menu(query, player):
        uid = player['user_id']
        clan_id = player.get('clan_id')
        if clan_id:
            info = db.get_clan_info(clan_id)
            if info:
                c = info['clan']
                members = info['members']
                text = (
                    f"⚔️ <b>[{html_escape(c['tag'])}] {html_escape(c['name'])}</b>\n"
                    f"📊 Уровень клана: {c['level']} · Побед: {c['wins']}\n"
                    f"👥 Участников: {len(members)}/20\n\n"
                    f"<b>Состав:</b>\n"
                )
                for m in members[:10]:
                    role_icon = "👑" if m['role'] == 'leader' else "⚔️"
                    text += f"{role_icon} {html_escape(m.get('username') or '—')} · ур.{m['level']} · {m['wins']}п\n"
                keyboard = [
                    [InlineKeyboardButton("🚪 Покинуть клан", callback_data='clan_leave')],
                    [InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')],
                ]
            else:
                text = "⚔️ Информация о клане недоступна."
                keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')]]
        else:
            text = (
                "⚔️ <b>КЛАНЫ</b>\n\n"
                "Ты не состоишь в клане.\n\n"
                f"• Создать клан: {db.CLAN_CREATE_COST_GOLD} золота\n"
                "• Или найди клан по тегу через /clan &lt;тег&gt;\n"
            )
            keyboard = [
                [InlineKeyboardButton("🏰 Создать клан", callback_data='clan_create_prompt')],
                [InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')],
            ]
        await CallbackHandlers._callback_set_message(query,text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    @staticmethod
    async def clan_create_prompt(query, player):
        text = (
            "🏰 <b>Создать клан</b>\n\n"
            f"Стоимость: <b>{db.CLAN_CREATE_COST_GOLD} золота</b> (у вас {player['gold']})\n\n"
            "Используй команду:\n"
            "<code>/clan create ИМЯ КЛАНА | ТЕГ</code>\n\n"
            "Пример: <code>/clan create Стальные Волки | SWF</code>\n"
            "(тег 2–4 символа, только латиница)"
        )
        keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data='clan_menu')]]
        await CallbackHandlers._callback_set_message(query,text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    @staticmethod
    async def clan_join(query, player, clan_id: int):
        result = db.join_clan(player['user_id'], clan_id)
        await query.answer(
            f"✅ Вступил в клан {result.get('clan_name', '')}!" if result['ok'] else f"❌ {result['reason']}",
            show_alert=True,
        )
        fresh = db.get_or_create_player(player['user_id'], player.get('username', ''))
        await CallbackHandlers.show_clan_menu(query, fresh)

    @staticmethod
    async def clan_leave(query, player):
        result = db.leave_clan(player['user_id'])
        await query.answer("✅ Покинул клан." if result['ok'] else f"❌ {result['reason']}", show_alert=True)
        if result['ok']:
            fresh = db.get_or_create_player(player['user_id'], player.get('username', ''))
            await CallbackHandlers.show_clan_menu(query, fresh)

    @staticmethod
    async def clan_view(query, clan_id: int):
        info = db.get_clan_info(clan_id)
        if not info:
            await query.answer("Клан не найден.", show_alert=True)
            return
        c = info['clan']
        members = info['members']
        text = (
            f"⚔️ <b>[{html_escape(c['tag'])}] {html_escape(c['name'])}</b>\n"
            f"📊 Уровень: {c['level']} · Побед: {c['wins']}\n"
            f"👥 {len(members)}/20 участников\n\n"
        )
        for m in members[:8]:
            role_icon = "👑" if m['role'] == 'leader' else "⚔️"
            text += f"{role_icon} {html_escape(m.get('username') or '—')} · ур.{m['level']}\n"
        keyboard = [
            [InlineKeyboardButton(f"➕ Вступить", callback_data=f'clan_join_{clan_id}')],
            [InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')],
        ]
        await CallbackHandlers._callback_set_message(query,text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    # ------------------------------------------------------------------
    # Invite inline
    # ------------------------------------------------------------------

    @staticmethod
    async def show_invite_inline(query, player, context):
        db.get_or_create_player(player['user_id'], player.get('username', ''))
        ref_code = db.get_referral_code(player['user_id'])
        uid = player["user_id"]
        stats = db.get_referral_stats(uid)
        recent = db.get_recent_referrals(uid, limit=3)
        me = await context.bot.get_me()
        bot_username = me.username or ""
        text = _referral_program_html(bot_username, ref_code, stats, recent)
        keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]]
        await CallbackHandlers._callback_set_message(query,text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

    # ------------------------------------------------------------------
    # Telegram Stars
    # ------------------------------------------------------------------

    @staticmethod
    async def send_stars_invoice(query, player, context, diamonds: int, stars: int):
        """Отправить инвойс для покупки алмазов через Telegram Stars."""
        from telegram import LabeledPrice
        try:
            await context.bot.send_invoice(
                chat_id=query.message.chat_id,
                title=f"{diamonds} 💎 алмазов",
                description=f"Покупка {diamonds} алмазов в Дуэль-Арене",
                payload=f"diamonds_{diamonds}",
                currency="XTR",  # Telegram Stars
                prices=[LabeledPrice(label=f"{diamonds} алмазов", amount=stars)],
                provider_token="",  # Stars не требует токен провайдера
            )
            await query.answer()
        except Exception as e:
            logger.error("Stars invoice error: %s", e)
            await query.answer("❌ Ошибка создания платежа. Попробуйте позже.", show_alert=True)

    @staticmethod
    async def send_premium_invoice(query, player, context):
        """Инвойс Premium подписки (Stars, payload premium_sub)."""
        from telegram import LabeledPrice
        from config import PREMIUM_SUBSCRIPTION_STARS

        stars = int(PREMIUM_SUBSCRIPTION_STARS)
        try:
            await context.bot.send_invoice(
                chat_id=query.message.chat_id,
                title="👑 Premium подписка",
                description="Дуэль-Арена: премиум-статус на период (разработка: бонусы будут расширены).",
                payload="premium_sub",
                currency="XTR",
                prices=[LabeledPrice(label="Premium подписка", amount=stars)],
                provider_token="",
            )
            await query.answer()
        except Exception as e:
            logger.error("Premium invoice error: %s", e)
            await query.answer("❌ Ошибка создания платежа. Попробуйте позже.", show_alert=True)

    # ------------------------------------------------------------------
    # back_to_main
    # ------------------------------------------------------------------

    @staticmethod
    async def back_to_main(query, player):
        """Вернуться в главное меню (как «Обновить»: реген, буфер итога боя, предупреждение о бое)."""
        await CallbackHandlers.refresh_main(query, player)

    @staticmethod
    async def back(query, player):
        """Вернуться назад"""
        await CallbackHandlers.back_to_main(query, player)

    @staticmethod
    async def refresh_main(query, player):
        """Обновить главный экран — применить реген HP и перерисовать."""
        uid = player['user_id']
        un = player.get('username') or ""
        endurance_inv = stamina_stats_invested(player.get('max_hp', PLAYER_START_MAX_HP), player.get('level', 1))
        regen_result = db.apply_hp_regen(uid, endurance_inv)
        if regen_result:
            player = dict(player)
            player['current_hp'] = regen_result['current_hp']
        fresh = db.get_or_create_player(uid, un)
        fresh = dict(fresh)
        fresh['current_hp'] = player['current_hp']

        if battle_system.get_battle_status(uid):
            extra = (
                "⚔️ <b>Бой ещё идёт на сервере</b> (в фоне).\n"
                "Прокрутите чат к сообщению с кнопками атаки/защиты. "
                "Если его нет — «🧹 Сбросить зависший бой» и начните заново."
            )
            await CallbackHandlers._send_profile_card(
                query, fresh, fresh.get('username') or "",
                CallbackHandlers._stale_battle_markup(),
                extra_text=extra,
            )
            return

        pending_end = battle_system.peek_battle_end_ui(uid)
        if pending_end:
            adapted = CallbackHandlers._adapt_result_for_user(pending_end, uid)
            delivered = await CallbackHandlers._show_battle_end(query, fresh, adapted)
            if not delivered:
                delivered = await CallbackHandlers._deliver_battle_end_chat(
                    query.get_bot(), query.from_user.id, fresh, adapted,
                )
            if delivered:
                battle_system.clear_battle_end_ui(uid)
            chat_id = query.message.chat_id if query.message else query.from_user.id
            await CallbackHandlers._notify_level_up_chat(query.get_bot(), chat_id, uid, adapted)
            return

        await CallbackHandlers._send_profile_card(
            query, fresh, fresh.get('username') or "",
            CallbackHandlers._main_menu_markup(),
        )

    @staticmethod
    async def claim_daily_quest(query, player):
        """Забрать награду за ежедневный квест."""
        result = db.claim_daily_quest_reward(player['user_id'])
        if not result.get("ok"):
            await query.answer(f"❌ {result.get('reason', 'Не удалось получить награду')}", show_alert=False)
            return

        await query.answer("✅ Награда получена!", show_alert=False)
        await CallbackHandlers._callback_set_message(
            query,
            (
                "🎁 <b>Награда за ежедневный квест получена!</b>\n\n"
                f"💰 +{result['gold']} золота\n"
                f"💎 +{result['diamonds']} алмаз"
            ),
            parse_mode='HTML',
        )
