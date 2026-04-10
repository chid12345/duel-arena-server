from handlers.ui_helpers import CallbackHandlers
from config import *
from database import db
from battle_system import battle_system


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
