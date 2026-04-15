import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
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

        opp_chat_id = pvp_entry["chat_id"]
        opp_msg_id = pvp_entry.get("message_id")
        bot = query.get_bot()
        p2_ui_set = False

        packed2 = CallbackHandlers._battle_message_html_for_user(opp_uid)
        if packed2:
            text2, pa2, pd2 = packed2
            markup2 = CallbackHandlers._battle_inline_markup(pa2, pd2)
            # 1) Редактируем старое сообщение P2
            if opp_msg_id:
                try:
                    await bot.edit_message_text(
                        chat_id=opp_chat_id, message_id=opp_msg_id,
                        text=text2, reply_markup=markup2, parse_mode='HTML',
                    )
                    battle_system.set_battle_p2_ui_message(opp_uid, opp_chat_id, opp_msg_id)
                    p2_ui_set = True
                except Exception as e_edit:
                    logger.warning("PvP: edit P2 failed opp_uid=%s: %s — fallback send_message", opp_uid, e_edit)
            # 2) Fallback: шлём P2 новое сообщение
            if not p2_ui_set:
                try:
                    sent2 = await bot.send_message(
                        chat_id=opp_chat_id,
                        text=text2, reply_markup=markup2, parse_mode='HTML',
                    )
                    battle_system.set_battle_p2_ui_message(opp_uid, opp_chat_id, sent2.message_id)
                    p2_ui_set = True
                    logger.info("PvP: sent new message to P2 opp_uid=%s msg_id=%s", opp_uid, sent2.message_id)
                except Exception as e_send:
                    logger.warning("PvP: send_message P2 also failed opp_uid=%s: %s — immediate AFK end", opp_uid, e_send)

        if not p2_ui_set:
            # P2 полностью недоступен — мгновенная AFK-победа P1, не ждём раундов таймера
            logger.info("PvP: P2 unreachable opp_uid=%s — ending battle_id=%s immediately", opp_uid, battle_id)
            result = await battle_system._end_battle_by_afk(battle_id, uid)
            await CallbackHandlers.dispatch_round_result_from_job(bot, chat_id, mid, uid, result)
            return

        battle_system.schedule_turn_timer(battle_id)
        return

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
