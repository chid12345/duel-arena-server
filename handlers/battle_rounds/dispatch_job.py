import logging

from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call
from database import db
from battle_system import battle_system

logger = logging.getLogger(__name__)


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
                chat_id=chat_id, message_id=message_id,
                text=text, reply_markup=markup, parse_mode='HTML',
            )
        except Exception as e:
            logger.warning(
                "dispatch_round_from_job: edit round uid=%s mid=%s: %s — шлём новое сообщение",
                user_id, message_id, e,
            )
            try:
                sent = await tg_api_call(
                    bot.send_message, chat_id=chat_id,
                    text=text, reply_markup=markup, parse_mode='HTML',
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
                "dispatch_round_from_job: итог боя не доставлен uid=%s — остаётся буфер для «Обновить»",
                user_id,
            )
        notify_chat = db.get_player_chat_id(user_id) or chat_id
        await CallbackHandlers._notify_level_up_chat(bot, notify_chat, user_id, adapted)


CallbackHandlers.dispatch_round_result_from_job = staticmethod(dispatch_round_result_from_job)
