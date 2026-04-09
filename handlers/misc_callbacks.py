"""
handlers/misc_callbacks.py — обработчики магазина, кланов, тренировок и прочих callback.
Методы monkey-patch-атся на CallbackHandlers.
"""

import logging
from html import escape as html_escape
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call, _referral_program_html
from config import *
from database import db

logger = logging.getLogger(__name__)


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
            [InlineKeyboardButton(f"💪 Сила +1  ({free_stats} очков)", callback_data='train_strength')],
            [InlineKeyboardButton(f"🤸 Ловкость +1  ({free_stats} очков)", callback_data='train_endurance')],
            [InlineKeyboardButton(f"💥 Интуиция +1  ({free_stats} очков)", callback_data='train_crit_stat')],
            [InlineKeyboardButton(f"❤️ Выносливость +{STAMINA_PER_FREE_STAT}  ({free_stats} очков)", callback_data='train_hp')]
        ])

    keyboard.extend([
        [InlineKeyboardButton("⚔️ Атака · улучшить",    callback_data='train_attack_power')],
        [InlineKeyboardButton("🏃 Уклон · улучшить",    callback_data='train_dodge')],
        [InlineKeyboardButton("🛡️ Блок · улучшить",     callback_data='train_block')],
        [InlineKeyboardButton("⚡ Крит · улучшить",     callback_data='train_critical')],
        [InlineKeyboardButton("⬅️ Назад",               callback_data='back')]
    ])

    reply_markup = InlineKeyboardMarkup(keyboard)
    await CallbackHandlers._callback_set_message(query, training_text, reply_markup=reply_markup, parse_mode='HTML')

CallbackHandlers.show_training = staticmethod(show_training)


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

CallbackHandlers.handle_training = staticmethod(handle_training)


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

    await CallbackHandlers._callback_set_message(query, rating_text, reply_markup=reply_markup)

CallbackHandlers.show_rating = staticmethod(show_rating)


async def show_shop(query, player):
    """Показать магазин — только рабочие товары."""
    boost_charges = player.get('xp_boost_charges', 0) or 0
    text = (
        f"🛒 <b>МАГАЗИН</b>\n\n"
        f"🪙 Золото: <b>{player['gold']}</b>  |  💎 Алмазы: <b>{player['diamonds']}</b>\n\n"
        f"<b>🧪 Зелья и бусты:</b>\n"
        f"• 🧪 Малое зелье HP · <b>60🪙</b> — восстановить 30% HP\n"
        f"• ⚗️ Большое зелье HP · <b>200🪙</b> — полное восстановление HP\n"
        f"• 💊 XP ×1.5 · <b>400🪙</b> — двойной опыт на 5 боёв"
        f" (у вас: {boost_charges} зарядов)\n\n"
        f"<b>💎 Премиум:</b>\n"
        f"• 🔄 Сброс характеристик · <b>{RESET_STATS_COST_DIAMONDS}💎</b> — вернуть все свободные статы\n"
        f"• 💎 Купить алмазы / Premium → /buy\n\n"
        f"<i>⚔️ Оружие и броня — скоро</i>"
    )
    from config import PREMIUM_SUBSCRIPTION_STARS

    keyboard = [
        [
            InlineKeyboardButton("🧪 Малое зелье · 60🪙",  callback_data='buy_hp_potion_small'),
            InlineKeyboardButton("⚗️ Зелье HP · 200🪙",    callback_data='buy_hp_potion'),
        ],
        [InlineKeyboardButton("💊 XP ×1.5 · 400🪙",        callback_data='buy_xp_boost')],
        [InlineKeyboardButton(f"🔄 Сброс статов · {RESET_STATS_COST_DIAMONDS}💎", callback_data='buy_stat_reset')],
        [
            InlineKeyboardButton(
                f"👑 Premium · {PREMIUM_SUBSCRIPTION_STARS}⭐",
                callback_data="stars_buy_premium",
            )
        ],
        [InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')],
    ]
    await CallbackHandlers._callback_set_message(query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

CallbackHandlers.show_shop = staticmethod(show_shop)


async def show_shop_category(query, player, category: str):
    """Редиректим в общий магазин — категории пока не разделены."""
    await CallbackHandlers.show_shop(query, player)

CallbackHandlers.show_shop_category = staticmethod(show_shop_category)


async def handle_shop_purchase(query, player, item_key: str):
    """Обработка покупок из магазина."""
    # Import BotHandlers here to avoid circular imports
    from handlers.commands import BotHandlers
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

CallbackHandlers.handle_shop_purchase = staticmethod(handle_shop_purchase)


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

    await CallbackHandlers._callback_set_message(query, stats_text, reply_markup=reply_markup, parse_mode='HTML')

CallbackHandlers.show_stats = staticmethod(show_stats)


# ------------------------------------------------------------------
# Сезон
# ------------------------------------------------------------------

async def show_season_info(query, player):
    season = db.get_active_season()
    if not season:
        await CallbackHandlers._callback_set_message(query, "Сезон не активен.", reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Назад", callback_data='back_to_main')]]))
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
    await CallbackHandlers._callback_set_message(query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

CallbackHandlers.show_season_info = staticmethod(show_season_info)


# ------------------------------------------------------------------
# Battle Pass
# ------------------------------------------------------------------

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
    await CallbackHandlers._callback_set_message(query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

CallbackHandlers.show_battle_pass = staticmethod(show_battle_pass)


async def claim_battle_pass_tier(query, player, tier: int):
    result = db.claim_battle_pass_tier(player['user_id'], tier)
    if result['ok']:
        await query.answer(f"✅ Тир {tier} получен! +{result['diamonds']}💎 +{result['gold']}💰", show_alert=True)
    else:
        await query.answer(f"❌ {result['reason']}", show_alert=True)
    fresh = db.get_or_create_player(player['user_id'], player.get('username', ''))
    await CallbackHandlers.show_battle_pass(query, fresh)

CallbackHandlers.claim_battle_pass_tier = staticmethod(claim_battle_pass_tier)


# ------------------------------------------------------------------
# Кланы
# ------------------------------------------------------------------

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
    await CallbackHandlers._callback_set_message(query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

CallbackHandlers.show_clan_menu = staticmethod(show_clan_menu)


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
    await CallbackHandlers._callback_set_message(query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

CallbackHandlers.clan_create_prompt = staticmethod(clan_create_prompt)


async def clan_join(query, player, clan_id: int):
    result = db.join_clan(player['user_id'], clan_id)
    await query.answer(
        f"✅ Вступил в клан {result.get('clan_name', '')}!" if result['ok'] else f"❌ {result['reason']}",
        show_alert=True,
    )
    fresh = db.get_or_create_player(player['user_id'], player.get('username', ''))
    await CallbackHandlers.show_clan_menu(query, fresh)

CallbackHandlers.clan_join = staticmethod(clan_join)


async def clan_leave(query, player):
    result = db.leave_clan(player['user_id'])
    await query.answer("✅ Покинул клан." if result['ok'] else f"❌ {result['reason']}", show_alert=True)
    if result['ok']:
        fresh = db.get_or_create_player(player['user_id'], player.get('username', ''))
        await CallbackHandlers.show_clan_menu(query, fresh)

CallbackHandlers.clan_leave = staticmethod(clan_leave)


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
    await CallbackHandlers._callback_set_message(query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

CallbackHandlers.clan_view = staticmethod(clan_view)


# ------------------------------------------------------------------
# Invite inline
# ------------------------------------------------------------------

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
    await CallbackHandlers._callback_set_message(query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode='HTML')

CallbackHandlers.show_invite_inline = staticmethod(show_invite_inline)


# ------------------------------------------------------------------
# Telegram Stars
# ------------------------------------------------------------------

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

CallbackHandlers.send_stars_invoice = staticmethod(send_stars_invoice)


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

CallbackHandlers.send_premium_invoice = staticmethod(send_premium_invoice)


# ------------------------------------------------------------------
# back_to_main
# ------------------------------------------------------------------

async def back_to_main(query, player):
    """Вернуться в главное меню (как «Обновить»: реген, буфер итога боя, предупреждение о бое)."""
    await CallbackHandlers.refresh_main(query, player)

CallbackHandlers.back_to_main = staticmethod(back_to_main)


async def back(query, player):
    """Вернуться назад"""
    await CallbackHandlers.back_to_main(query, player)

CallbackHandlers.back = staticmethod(back)


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

    from battle_system import battle_system
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

CallbackHandlers.refresh_main = staticmethod(refresh_main)


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
            "⚔️ <b>Боец Арены — задание выполнено!</b>\n\n"
            "Арена не делает выходных — и вы доказали это сегодня.\n\n"
            f"🪙 +{result['gold']} золота\n"
            f"⭐ +{result.get('xp', 150)} опыта"
        ),
        parse_mode='HTML',
    )

# ── Обработчики гардероба ───────────────────────────────────────────────────

async def wardrobe_menu_callback(query, bot, user_id: int, page: int = 0):
    """Обработчик меню гардероба."""
    await CallbackHandlers.wardrobe_menu(query, bot, user_id, page)

async def wardrobe_type_callback(query, bot, user_id: int, class_type: str, page: int = 0):
    """Обработчик меню типа классов."""
    await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, class_type, page)

async def wardrobe_class_callback(query, bot, user_id: int, class_type: str, class_id: str, page: int):
    """Обработчик действия с классом."""
    await CallbackHandlers.wardrobe_class_action(query, bot, user_id, class_type, class_id, page)

async def usdt_create_callback(query, bot, user_id: int):
    """Обработчик создания USDT-образа."""
    await CallbackHandlers.usdt_create_action(query, bot, user_id)

async def usdt_equip_callback(query, bot, user_id: int, class_id: str, page: int):
    """Обработчик экипировки USDT-образа."""
    await CallbackHandlers.usdt_equip_action(query, bot, user_id, class_id, page)

async def usdt_save_callback(query, bot, user_id: int, class_id: str, page: int):
    """Обработчик сохранения статов в USDT-образ."""
    await CallbackHandlers.usdt_save_action(query, bot, user_id, class_id, page)

CallbackHandlers.claim_daily_quest = staticmethod(claim_daily_quest)
