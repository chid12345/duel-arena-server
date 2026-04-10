from handlers.ui_helpers import CallbackHandlers
from database import db
from battle_system import battle_system


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
                query, text,
                reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
                parse_mode='HTML',
            )
            CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
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
            query, text,
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
        await CallbackHandlers._pvp_push_other(query.get_bot(), user_id, round_result)
        await query.answer()
        return

    if round_result.get('status') == 'choice_made':
        ctx = battle_system.get_battle_ui_context(user_id)
        if ctx:
            text = CallbackHandlers._build_battle_screen_html(ctx)
            chat_id, mid = await CallbackHandlers._callback_set_message(
                query, text,
                reply_markup=CallbackHandlers._battle_inline_markup(),
                parse_mode='HTML',
            )
            CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
        await query.answer()
        return

    await query.answer()


CallbackHandlers._handle_round_submitted = staticmethod(_handle_round_submitted)
