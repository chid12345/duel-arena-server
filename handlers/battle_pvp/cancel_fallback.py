from handlers.ui_helpers import CallbackHandlers
from config import *
from database import db


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
