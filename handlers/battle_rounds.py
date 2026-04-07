"""
handlers/battle_rounds.py — механика ходов: таймер, выбор зоны, автоход, статы соперника.
"""

import logging

from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call, _battle_turn_lock
from config import *
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


async def show_battle_opponent_stats(query, user_id):
    """Всплывающее окно со статами соперника."""
    ctx = battle_system.get_battle_ui_context(user_id)
    if not ctx:
        await query.answer("Бой не найден или уже завершён.", show_alert=False)
        return
    nm = str(ctx.get("opponent_name") or "Соперник")
    if len(nm) > 18:
        nm = nm[:15] + "…"
    lv   = int(ctx['opponent_level'])
    s    = int(ctx['opp_strength'])
    agi  = int(ctx['opp_endurance'])
    intu = int(ctx['opp_crit'])
    vyn  = int(ctx.get('opp_stamina_invested', 0))
    mhp  = int(ctx.get('opp_max_hp', ctx['opp_max']))
    chp  = int(ctx['opp_hp'])
    tf = total_free_stats_at_level(lv)
    avg_agi  = max(1, PLAYER_START_ENDURANCE + tf // 4)
    avg_intu = max(1, PLAYER_START_CRIT + tf // 4)
    dodge_p  = int(min(DODGE_MAX_CHANCE, agi  / (agi  + avg_agi)  * DODGE_MAX_CHANCE) * 100)
    crit_p   = int(min(CRIT_MAX_CHANCE,  intu / (intu + avg_intu) * CRIT_MAX_CHANCE)  * 100)
    armor_p  = int(min(ARMOR_ABSOLUTE_MAX, vyn / (vyn + ARMOR_STAMINA_K_ABS)) * 100) if vyn > 0 else 0
    dmg      = int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER))
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
                    text, pa, pd = packed
                    chat_id, mid = await CallbackHandlers._callback_set_message(
                        query, text,
                        reply_markup=CallbackHandlers._battle_inline_markup(pa, pd),
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
