import logging

from handlers.ui_helpers import CallbackHandlers
from handlers.common import _battle_turn_lock
from config import (
    ARMOR_ABSOLUTE_MAX,
    ARMOR_STAMINA_K_ABS,
    CRIT_MAX_CHANCE,
    DODGE_MAX_CHANCE,
    PLAYER_START_CRIT,
    PLAYER_START_ENDURANCE,
    STRENGTH_DAMAGE_FLAT_PER_LEVEL,
    STRENGTH_DAMAGE_POWER,
    STRENGTH_DAMAGE_SCALE,
    total_free_stats_at_level,
)
from battle_system import battle_system

logger = logging.getLogger(__name__)


async def show_battle_opponent_stats(query, user_id):
    """Всплывающее окно со статами соперника."""
    ctx = battle_system.get_battle_ui_context(user_id)
    if not ctx:
        await query.answer("Бой не найден или уже завершён.", show_alert=False)
        return
    nm = str(ctx.get("opponent_name") or "Соперник")
    if len(nm) > 18:
        nm = nm[:15] + "…"
    lv = int(ctx['opponent_level'])
    s = int(ctx['opp_strength'])
    agi = int(ctx['opp_endurance'])
    intu = int(ctx['opp_crit'])
    vyn = int(ctx.get('opp_stamina_invested', 0))
    mhp = int(ctx.get('opp_max_hp', ctx['opp_max']))
    chp = int(ctx['opp_hp'])
    tf = total_free_stats_at_level(lv)
    avg_agi = max(1, PLAYER_START_ENDURANCE + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    dodge_p = int(min(DODGE_MAX_CHANCE, agi / (agi + avg_agi) * DODGE_MAX_CHANCE) * 100)
    crit_p = int(min(CRIT_MAX_CHANCE, intu / (intu + avg_intu) * CRIT_MAX_CHANCE) * 100)
    armor_p = int(min(ARMOR_ABSOLUTE_MAX, vyn / (vyn + ARMOR_STAMINA_K_ABS)) * 100) if vyn > 0 else 0
    dmg = int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER))
    txt = (
        f"{nm} · ур.{lv} · 🏆{ctx['opp_rating']}\n"
        f"💪 {s}  🛡 -{armor_p}%\n"
        f"🤸 {agi}  💥 {intu}\n"
        f"❤️ {chp}/{mhp} HP  ·  вын: {vyn}"
    )
    if len(txt) > 195:
        txt = txt[:192] + "…"
    await query.answer(txt, show_alert=True)


CallbackHandlers.show_battle_opponent_stats = staticmethod(show_battle_opponent_stats)


async def handle_battle_refresh(query, user_id):
    """Перерисовать сообщение боя из актуального состояния."""
    async with _battle_turn_lock(user_id):
        packed = CallbackHandlers._battle_message_html_for_user(user_id)
        if not packed:
            await CallbackHandlers._resolve_stale_battle_message(query, user_id)
            return
        text, pa, pd = packed
        chat_id, mid = await CallbackHandlers._callback_set_message(
            query, text,
            reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
            parse_mode='HTML',
        )
        CallbackHandlers._sync_battle_ui_pointer(user_id, chat_id, mid)
        await query.answer()


CallbackHandlers.handle_battle_refresh = staticmethod(handle_battle_refresh)


async def handle_battle_auto(query, user_id):
    """Случайный полный ход."""
    async with _battle_turn_lock(user_id):
        if not battle_system.get_battle_status(user_id):
            await CallbackHandlers._resolve_stale_battle_message(query, user_id)
            return
        try:
            result = await battle_system.submit_auto_round(user_id)
            if 'error' in result:
                await query.answer(result['error'], show_alert=True)
                return
            await CallbackHandlers._handle_round_submitted(query, user_id, result)
        except Exception as e:
            logger.error(f"Error in battle auto: {e}")
            await CallbackHandlers._callback_set_message(query, "❌ Ошибка в бою")
            await query.answer()


CallbackHandlers.handle_battle_auto = staticmethod(handle_battle_auto)
