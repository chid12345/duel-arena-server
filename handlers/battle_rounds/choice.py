import logging

from handlers.ui_helpers import CallbackHandlers
from handlers.common import _battle_turn_lock
from battle_system import battle_system

logger = logging.getLogger(__name__)


async def handle_battle_choice(query, user_id, callback_data):
    """Обработать выбор зоны атаки/защиты в бою."""
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
                    text, pa, pd, log_exp = packed
                    chat_id, mid = await CallbackHandlers._callback_set_message(
                        query, text,
                        reply_markup=CallbackHandlers._battle_inline_markup(pa, pd, log_exp),
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


CallbackHandlers.handle_battle_choice = staticmethod(handle_battle_choice)
