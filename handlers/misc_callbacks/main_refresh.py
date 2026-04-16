"""Навигация «назад» / обновление главного экрана и ежедневный квест."""

from battle_system import battle_system

from handlers.ui_helpers import CallbackHandlers
from config import *
from config import exp_needed_for_next_level
from database import db


async def back_to_main(query, player):
    """Вернуться в главное меню (как «Обновить»: реген, буфер итога боя, предупреждение о бое)."""
    await CallbackHandlers.refresh_main(query, player)


CallbackHandlers.back_to_main = staticmethod(back_to_main)


async def back(query, player):
    """Вернуться назад"""
    await CallbackHandlers.back_to_main(query, player)


CallbackHandlers.back = staticmethod(back)


async def refresh_main(query, player):
    """Обновить главный экран — загрузить свежие данные из БД, применить реген HP."""
    uid = player["user_id"]
    un = player.get("username") or ""
    # Resync: если XP накопился без пересчёта уровня — пересчитать
    try:
        tmp = db.get_or_create_player(uid, un)
        p_exp = int(tmp.get("exp", 0) or 0)
        p_lv = int(tmp.get("level", 1) or 1)
        if p_exp >= exp_needed_for_next_level(p_lv) and p_lv < MAX_LEVEL:
            db.grant_exp_with_levelup(uid, 0)
    except Exception:
        pass

    fresh = db.get_or_create_player(uid, un)
    fresh = dict(fresh)
    endurance_inv = stamina_stats_invested(fresh.get("max_hp", PLAYER_START_MAX_HP), fresh.get("level", 1))
    regen_result = db.apply_hp_regen(uid, endurance_inv)
    if regen_result:
        fresh["current_hp"] = regen_result["current_hp"]

    if battle_system.get_battle_status(uid):
        extra = (
            "⚔️ <b>Бой ещё идёт на сервере</b> (в фоне).\n"
            "Прокрутите чат к сообщению с кнопками атаки/защиты. "
            "Если его нет — «🧹 Сбросить зависший бой» и начните заново."
        )
        await CallbackHandlers._send_profile_card(
            query,
            fresh,
            fresh.get("username") or "",
            CallbackHandlers._stale_battle_markup(),
            extra_text=extra,
        )
        return

    pending_end = battle_system.peek_battle_end_ui(uid)
    if pending_end:
        adapted = CallbackHandlers._adapt_result_for_user(pending_end, uid)
        delivered = await CallbackHandlers._show_battle_end(query, fresh, adapted)
        if not delivered:
            delivered = await CallbackHandlers._deliver_battle_end_chat(
                query.get_bot(), query.from_user.id, fresh, adapted,
            )
        if delivered:
            battle_system.clear_battle_end_ui(uid)
        chat_id = query.message.chat_id if query.message else query.from_user.id
        await CallbackHandlers._notify_level_up_chat(query.get_bot(), chat_id, uid, adapted)
        return

    await CallbackHandlers._send_profile_card(
        query, fresh, fresh.get("username") or "", CallbackHandlers._main_menu_markup(),
    )


CallbackHandlers.refresh_main = staticmethod(refresh_main)


async def claim_daily_quest(query, player):
    """Забрать награду за ежедневный квест."""
    result = db.claim_daily_quest_reward(player["user_id"])
    if not result.get("ok"):
        await query.answer(f"❌ {result.get('reason', 'Не удалось получить награду')}", show_alert=False)
        return

    await query.answer("✅ Награда получена!", show_alert=False)
    await CallbackHandlers._callback_set_message(
        query,
        (
            "⚔️ <b>Боец Арены — задание выполнено!</b>\n\n"
            "Арена не делает выходных — и вы доказали это сегодня.\n\n"
            f"🪙 +{result['gold']} золота\n"
            f"⭐ +{result.get('xp', 150)} опыта"
        ),
        parse_mode="HTML",
    )


CallbackHandlers.claim_daily_quest = staticmethod(claim_daily_quest)
