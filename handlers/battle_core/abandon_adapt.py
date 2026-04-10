"""Сброс боя, устаревшее сообщение, адаптация результата, текст итога."""

import logging
from html import escape as html_escape

from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call
from database import db
from battle_system import battle_system

logger = logging.getLogger(__name__)


async def handle_battle_abandon(query, player):
    """Сброс зависшего боя без записи в статистику."""
    if battle_system.force_abandon_battle(player["user_id"]):
        await CallbackHandlers._callback_set_message(
            query,
            "🧹 Бой сброшен (без записи в статистику). Можно начать заново.",
            reply_markup=CallbackHandlers._main_menu_markup(),
            parse_mode="HTML",
        )
    else:
        await CallbackHandlers._callback_set_message(
            query,
            "Активного боя в памяти нет. Главное меню:",
            reply_markup=CallbackHandlers._main_menu_markup(),
            parse_mode="HTML",
        )


CallbackHandlers.handle_battle_abandon = staticmethod(handle_battle_abandon)


async def _resolve_stale_battle_message(query, user_id: int) -> None:
    """Нет активного боя в памяти: показать сохранённый итог или главное меню."""
    snap = battle_system.peek_battle_end_ui(user_id)
    if snap:
        player = db.get_or_create_player(user_id, query.from_user.username or "")
        adapted = CallbackHandlers._adapt_result_for_user(snap, user_id)
        delivered = await CallbackHandlers._show_battle_end(query, player, adapted)
        if not delivered:
            delivered = await CallbackHandlers._deliver_battle_end_chat(
                query.get_bot(), query.from_user.id, player, adapted,
            )
        if delivered:
            battle_system.clear_battle_end_ui(user_id)
        await query.answer()
        return
    player = db.get_or_create_player(user_id, query.from_user.username or "")
    await CallbackHandlers._send_profile_card(
        query,
        player,
        player.get("username") or "",
        CallbackHandlers._main_menu_markup(),
        extra_text="⚠️ Бой уже завершён или устарел.",
    )
    await query.answer()


CallbackHandlers._resolve_stale_battle_message = staticmethod(_resolve_stale_battle_message)


def _adapt_result_for_user(result: dict, user_id: int) -> dict:
    """Вернуть копию round_result с перспективой user_id (нужно для P2 в PvP)."""
    winner_id = result.get("winner_id")
    if winner_id is None:
        return result
    p1_uid = result.get("pvp_p1_user_id")
    if p1_uid is not None and user_id == p1_uid:
        return result
    r = dict(result)
    r["human_won"] = winner_id == user_id
    r["damage_to_opponent"] = result.get("damage_to_you")
    r["damage_to_you"] = result.get("damage_to_opponent")
    r["gold_reward"] = result.get("p2_gold_reward", 0)
    r["exp_reward"] = result.get("p2_exp_reward", 0)
    r["xp_boosted"] = result.get("p2_xp_boosted", False)
    r["streak_bonus_gold"] = result.get("p2_streak_bonus_gold", 0)
    r["win_streak"] = result.get("p2_win_streak", 0)
    r["level_up"] = result.get("p2_level_up", False)
    r["level_up_level"] = result.get("p2_level_up_level", None)
    return r


CallbackHandlers._adapt_result_for_user = staticmethod(_adapt_result_for_user)


def _battle_end_stats_html(round_result: dict) -> str:
    """Суммарный урон за бой."""
    d_opp = round_result.get("damage_to_opponent")
    d_you = round_result.get("damage_to_you")
    if d_opp is None or d_you is None:
        return ""
    rnd = int(round_result.get("rounds") or 0)
    return (
        f"\n\n📊 <b>Итог размена</b>\n"
        f"• Урон по врагу: <b>{d_opp}</b> HP\n"
        f"• По вам: <b>{d_you}</b> HP\n"
        f"• Раундов: {rnd}"
    )


CallbackHandlers._battle_end_stats_html = staticmethod(_battle_end_stats_html)


def _battle_end_summary(player: dict, round_result: dict) -> str:
    """Краткий итог боя (caption для карточки профиля)."""
    stats = CallbackHandlers._battle_end_stats_html(round_result)
    if round_result.get("is_test_battle"):
        rnd = int(round_result.get("rounds") or 0)
        if round_result.get("human_won"):
            s = "🏁 <b>Победа</b> в тестовом бою. Награды не изменились."
        else:
            s = "💀 <b>Поражение</b> в тестовом бою. Награды не изменились."
        if not stats:
            s += f" Раундов: {rnd}."
        return s + stats
    if round_result.get("human_won"):
        gb = round_result.get("gold_reward", 0)
        expb = round_result.get("exp_reward", 0)
        sb = round_result.get("streak_bonus_gold", 0)
        ws = round_result.get("win_streak", 0)
        s = f"🏁 <b>Победа!</b>  +{gb} 💰"
        if round_result.get("xp_boosted"):
            s += f"  +{expb} ⭐ (XP-буст!)"
        else:
            s += f"  +{expb} ⭐"
        if sb:
            s += f"\n🔥 Серия {ws} побед! +{sb} 💰 бонус"
        total_battles = player.get("wins", 0) + player.get("losses", 0)
        if total_battles == 1:
            s += "\n\n💡 Вложи статы: Сила→урон, Ловкость→уворот, Выносливость→броня"
        elif total_battles == 3:
            s += "\n\n💡 Купи ❤️ Зелье HP в магазине за 30 💰"
        elif total_battles == 5:
            s += "\n\n💡 Ежедневные квесты /quests — 40 💰 и 1 💎 в день!"
    else:
        s = "💀 <b>Поражение.</b>  Наград нет."
        total_battles = player.get("wins", 0) + player.get("losses", 0)
        if total_battles <= 5:
            s += "  Атакуй и защищай ТУЛОВИЩЕ — самая большая зона."
    return s + stats


CallbackHandlers._battle_end_summary = staticmethod(_battle_end_summary)


def _battle_end_message_with_welcome(player: dict, round_result: dict) -> str:
    """Итог боя + главный экран (fallback если фото не работает)."""
    summary = CallbackHandlers._battle_end_summary(player, round_result)
    welcome = CallbackHandlers._welcome_html(player, player.get("username") or "")
    return f"{summary}\n\n{welcome}"


CallbackHandlers._battle_end_message_with_welcome = staticmethod(_battle_end_message_with_welcome)
