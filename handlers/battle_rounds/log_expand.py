"""Развернуть / свернуть лог боя."""

from handlers.ui_helpers import CallbackHandlers
from handlers.common import _battle_turn_lock
from battle_system import battle_system


async def handle_battle_log_expand(query, user_id):
    """Показать историю всех раундов."""
    async with _battle_turn_lock(user_id):
        bid = battle_system.battle_queue.get(user_id)
        battle = battle_system.active_battles.get(bid) if bid else None
        if not battle:
            await query.answer("Бой не найден.", show_alert=False)
            return
        battle['log_expanded'] = True
        packed = CallbackHandlers._battle_message_html_for_user(user_id)
        if not packed:
            await CallbackHandlers._resolve_stale_battle_message(query, user_id)
            return
        text, pa, pd, log_exp = packed
        chat_id, mid = await CallbackHandlers._callback_set_message(
            query, text,
            reply_markup=CallbackHandlers._battle_inline_markup(pa, pd, log_exp),
            parse_mode='HTML',
        )
        CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
        await query.answer()


CallbackHandlers.handle_battle_log_expand = staticmethod(handle_battle_log_expand)


async def handle_battle_log_collapse(query, user_id):
    """Свернуть лог — показать только последний раунд."""
    async with _battle_turn_lock(user_id):
        bid = battle_system.battle_queue.get(user_id)
        battle = battle_system.active_battles.get(bid) if bid else None
        if not battle:
            await query.answer("Бой не найден.", show_alert=False)
            return
        battle['log_expanded'] = False
        packed = CallbackHandlers._battle_message_html_for_user(user_id)
        if not packed:
            await CallbackHandlers._resolve_stale_battle_message(query, user_id)
            return
        text, pa, pd, log_exp = packed
        chat_id, mid = await CallbackHandlers._callback_set_message(
            query, text,
            reply_markup=CallbackHandlers._battle_inline_markup(pa, pd, log_exp),
            parse_mode='HTML',
        )
        CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
        await query.answer()


CallbackHandlers.handle_battle_log_collapse = staticmethod(handle_battle_log_collapse)
