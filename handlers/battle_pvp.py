"""
handlers/battle_pvp.py — поиск боя, PvP очередь, уведомление второго игрока, бой с ботом.
"""

import logging
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call
from config import *
from database import db
from battle_system import battle_system

logger = logging.getLogger(__name__)


async def find_battle(query, player):
    """Найти бой: сначала живой PvP-соперник, иначе — встать в очередь."""
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

    endurance_inv = stamina_stats_invested(player.get('max_hp', PLAYER_START_MAX_HP), player.get('level', 1))
    regen_result = db.apply_hp_regen(uid, endurance_inv)
    if regen_result:
        player = dict(player)
        player['current_hp'] = regen_result['current_hp']

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

        packed = CallbackHandlers._battle_message_html_for_user(uid)
        if not packed:
            await CallbackHandlers._callback_set_message(query, "❌ Ошибка старта боя.")
            return
        text1, pa1, pd1 = packed
        chat_id, mid = await CallbackHandlers._callback_set_message(
            query, text1,
            reply_markup=CallbackHandlers._battle_inline_markup(pa1, pd1),
            parse_mode='HTML',
        )
        battle_system.set_battle_ui_message(uid, chat_id, mid)

        # Уведомляем P2 (ждавшего игрока)
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

    # Живых соперников нет — встаём в очередь
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

CallbackHandlers.find_battle = staticmethod(find_battle)


async def _start_bot_battle(query, player):
    """Запустить бой с ботом (PvE)."""
    uid = player['user_id']
    opponent = db.find_suitable_opponent(player["level"])
    if not opponent:
        await CallbackHandlers._callback_set_message(query, "😔 Не удалось найти противника. Попробуйте позже.")
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
        await CallbackHandlers._callback_set_message(query, "❌ Ошибка старта боя.")
        return
    battle_ui, pa, pd = packed
    chat_id, mid = await CallbackHandlers._callback_set_message(
        query, battle_ui,
        reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
        parse_mode='HTML',
    )
    battle_system.set_battle_ui_message(uid, chat_id, mid)
    battle_system.schedule_turn_timer(battle_id)

CallbackHandlers._start_bot_battle = staticmethod(_start_bot_battle)


async def pvp_cancel(query, player):
    """Отмена поиска PvP — выходим из очереди."""
    db.pvp_dequeue(player['user_id'])
    player = db.get_or_create_player(player['user_id'], query.from_user.username or "")
    await CallbackHandlers._callback_set_message(query,
        CallbackHandlers._welcome_html(player, player.get('username') or ""),
        reply_markup=CallbackHandlers._main_menu_markup(),
        parse_mode='HTML',
    )

CallbackHandlers.pvp_cancel = staticmethod(pvp_cancel)


async def pvp_bot_fallback(query, player):
    """Устали ждать — выйти из очереди и начать бой с ботом."""
    db.pvp_dequeue(player['user_id'])
    uid = player['user_id']
    un = query.from_user.username or ""
    player = db.get_or_create_player(uid, un)
    endurance_inv = stamina_stats_invested(player.get('max_hp', PLAYER_START_MAX_HP), player.get('level', 1))
    regen_result = db.apply_hp_regen(uid, endurance_inv)
    if regen_result:
        player = dict(player)
        player['current_hp'] = regen_result['current_hp']
    await CallbackHandlers._start_bot_battle(query, player)

CallbackHandlers.pvp_bot_fallback = staticmethod(pvp_bot_fallback)


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

CallbackHandlers._pvp_push_other = staticmethod(_pvp_push_other)
