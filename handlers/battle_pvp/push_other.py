from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call
from database import db
from battle_system import battle_system


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
