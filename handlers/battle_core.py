"""
handlers/battle_core.py — диспетчер всех кнопок + отображение итогов боя.
"""

import logging
from html import escape as html_escape
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes
from telegram.error import BadRequest

from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call, RateLimiter, _battle_turn_lock, _telegram_message_unchanged
from config import *
from database import db
from battle_system import battle_system
from profile_card import generate_profile_card

logger = logging.getLogger(__name__)


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
        elif callback_data == 'season_info':
            await CallbackHandlers.show_season_info(query, player)
        elif callback_data == 'battle_pass':
            await CallbackHandlers.show_battle_pass(query, player)
        elif callback_data.startswith('bp_claim_'):
            tier = int(callback_data.split('_')[-1])
            await CallbackHandlers.claim_battle_pass_tier(query, player, tier)
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
        elif callback_data == 'pvp_cancel':
            await CallbackHandlers.pvp_cancel(query, player)
        elif callback_data == 'pvp_bot_fallback':
            await CallbackHandlers.pvp_bot_fallback(query, player)
        elif callback_data == 'show_invite':
            await CallbackHandlers.show_invite_inline(query, player, context)
        elif callback_data.startswith('wardrobe_menu:'):
            # Гардероб
            try:
                page = int(callback_data.split(':')[1])
                from handlers.misc_callbacks import wardrobe_menu_callback
                await wardrobe_menu_callback(query, context.bot, user.id, page)
            except Exception as e:
                logger.error("wardrobe_menu error: %s", e)
                await query.answer("Ошибка открытия гардероба")
        elif callback_data.startswith('wardrobe_type:'):
            # Тип классов в гардеробе
            try:
                _, class_type, page_str = callback_data.split(':')
                page = int(page_str)
                from handlers.misc_callbacks import wardrobe_type_callback
                await wardrobe_type_callback(query, context.bot, user.id, class_type, page)
            except Exception as e:
                logger.error("wardrobe_type error: %s", e)
                await query.answer("Ошибка открытия типа классов")
        elif callback_data.startswith('wardrobe_class:'):
            # Действие с классом
            try:
                _, class_type, class_id, page_str = callback_data.split(':')
                page = int(page_str)
                from handlers.misc_callbacks import wardrobe_class_callback
                await wardrobe_class_callback(query, context.bot, user.id, class_type, class_id, page)
            except Exception as e:
                logger.error("wardrobe_class error: %s", e)
                await query.answer("Ошибка действия с классом")
        elif callback_data == 'usdt_create':
            # Создание USDT-образа
            from handlers.misc_callbacks import usdt_create_callback
            await usdt_create_callback(query, context.bot, user.id)
        elif callback_data.startswith('usdt_equip:'):
            # Экипировка USDT-образа
            try:
                _, class_id, page_str = callback_data.split(':')
                page = int(page_str)
                from handlers.misc_callbacks import usdt_equip_callback
                await usdt_equip_callback(query, context.bot, user.id, class_id, page)
            except Exception as e:
                logger.error("usdt_equip error: %s", e)
                await query.answer("Ошибка экипировки USDT-образа")
        elif callback_data.startswith('usdt_save:'):
            # Сохранение статов в USDT-образ
            try:
                _, class_id, page_str = callback_data.split(':')
                page = int(page_str)
                from handlers.misc_callbacks import usdt_save_callback
                await usdt_save_callback(query, context.bot, user.id, class_id, page)
            except Exception as e:
                logger.error("usdt_save error: %s", e)
                await query.answer("Ошибка сохранения статов")
        elif callback_data == "stars_buy_premium":
            await CallbackHandlers.send_premium_invoice(query, player, context)
        elif callback_data.startswith("stars_buy_"):
            parts = callback_data.split("_")
            diamonds, stars = int(parts[2]), int(parts[3])
            await CallbackHandlers.send_stars_invoice(query, player, context, diamonds, stars)
        elif callback_data.startswith('train_'):
            await CallbackHandlers.handle_training(query, player, callback_data.replace('train_', ''))
        elif callback_data.startswith('buy_'):
            await CallbackHandlers.handle_shop_purchase(query, player, callback_data.replace('buy_', ''))
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
            await CallbackHandlers._callback_set_message(query, "❌ Неизвестное действие")

    except BadRequest as e:
        if _telegram_message_unchanged(e):
            return
        logger.exception("BadRequest in callback handler")
        try:
            await CallbackHandlers._callback_set_message(query, "❌ Произошла ошибка. Попробуйте снова.")
        except Exception:
            pass
    except Exception as e:
        logger.exception("Error in callback handler: %s", e)
        try:
            await CallbackHandlers._callback_set_message(query, "❌ Произошла ошибка. Попробуйте снова.")
        except Exception:
            pass

CallbackHandlers.handle_callback = staticmethod(handle_callback)


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

CallbackHandlers.handle_battle_abandon = staticmethod(handle_battle_abandon)


async def _resolve_stale_battle_message(query, user_id: int) -> None:
    """Нет активного боя в памяти: показать сохранённый итог или главное меню."""
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

CallbackHandlers._resolve_stale_battle_message = staticmethod(_resolve_stale_battle_message)


def _adapt_result_for_user(result: dict, user_id: int) -> dict:
    """Вернуть копию round_result с перспективой user_id (нужно для P2 в PvP)."""
    winner_id = result.get('winner_id')
    if winner_id is None:
        return result
    p1_uid = result.get('pvp_p1_user_id')
    if p1_uid is not None and user_id == p1_uid:
        return result
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

CallbackHandlers._adapt_result_for_user = staticmethod(_adapt_result_for_user)


def _battle_end_stats_html(round_result: dict) -> str:
    """Суммарный урон за бой."""
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

CallbackHandlers._battle_end_stats_html = staticmethod(_battle_end_stats_html)


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

CallbackHandlers._battle_end_summary = staticmethod(_battle_end_summary)


def _battle_end_message_with_welcome(player: dict, round_result: dict) -> str:
    """Итог боя + главный экран (fallback если фото не работает)."""
    summary = CallbackHandlers._battle_end_summary(player, round_result)
    welcome = CallbackHandlers._welcome_html(player, player.get('username') or "")
    return f"{summary}\n\n{welcome}"

CallbackHandlers._battle_end_message_with_welcome = staticmethod(_battle_end_message_with_welcome)


async def _deliver_battle_end_chat(bot, chat_id: int, player: dict, round_result: dict) -> bool:
    """Новое сообщение с итогом боя (старое сообщение недоступно для правки)."""
    summary = CallbackHandlers._battle_end_summary(player, round_result)
    markup = CallbackHandlers._main_menu_markup()
    img_bytes = generate_profile_card(player)
    try:
        await tg_api_call(
            bot.send_photo, chat_id=chat_id, photo=img_bytes,
            caption=summary, reply_markup=markup, parse_mode='HTML',
        )
        return True
    except Exception as e:
        logger.warning("_deliver_battle_end_chat: photo failed: %s", e)
    try:
        text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
        await tg_api_call(
            bot.send_message, chat_id=chat_id, text=text,
            reply_markup=markup, parse_mode='HTML',
        )
        return True
    except Exception as e:
        logger.warning("_deliver_battle_end_chat: message failed: %s", e)
    return False

CallbackHandlers._deliver_battle_end_chat = staticmethod(_deliver_battle_end_chat)


async def _show_battle_end(target, player: dict, round_result: dict, *, is_bot_target=False, bot=None, chat_id=None, message_id=None) -> bool:
    """Показать итог боя как карточку профиля."""
    from telegram import InputMediaPhoto

    summary = CallbackHandlers._battle_end_summary(player, round_result)
    markup = CallbackHandlers._main_menu_markup()
    img_bytes = generate_profile_card(player)

    if is_bot_target:
        try:
            media = InputMediaPhoto(media=img_bytes, caption=summary, parse_mode='HTML')
            await tg_api_call(
                bot.edit_message_media, chat_id=chat_id, message_id=message_id,
                media=media, reply_markup=markup,
            )
            return True
        except Exception:
            pass
        try:
            text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
            await tg_api_call(
                bot.edit_message_text, chat_id=chat_id, message_id=message_id,
                text=text, reply_markup=markup, parse_mode='HTML',
            )
            return True
        except Exception:
            pass
        return await CallbackHandlers._deliver_battle_end_chat(bot, chat_id, player, round_result)

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
            bot_obj.send_photo, chat_id=tg_chat_id, photo=img_bytes,
            caption=summary, reply_markup=markup, parse_mode='HTML',
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

CallbackHandlers._show_battle_end = staticmethod(_show_battle_end)


async def _notify_level_up_chat(bot, chat_id: int, user_id: int, round_result: dict):
    """Отдельное сообщение при апе уровня победителем."""
    lvl = round_result.get('level_up_level')
    if not lvl or round_result.get('is_test_battle'):
        return
    if round_result.get('winner_id') != user_id:
        return
    pl = db.get_or_create_player(user_id, "")
    name = html_escape((pl.get('username') or '').strip() or 'Игрок')
    await tg_api_call(
        bot.send_message, chat_id=chat_id,
        text=f"🎉 {name} достиг {int(lvl)} уровня!",
        parse_mode='HTML',
    )

CallbackHandlers._notify_level_up_chat = staticmethod(_notify_level_up_chat)
