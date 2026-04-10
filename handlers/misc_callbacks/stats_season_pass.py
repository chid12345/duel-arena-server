"""Статистика, сезон, боевой пропуск (патчи CallbackHandlers)."""

from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
from config import *
from database import db


async def show_stats(query, player):
    """Показать статистику"""
    improvements = db.get_player_improvements(player["user_id"])

    un = html_escape(player.get("username") or "")
    stats_text = (
        f"📈 <b>Подробная статистика</b>\n\n"
        f"👤 <b>Имя:</b> {un}\n"
        f"📊 <b>Уровень:</b> {player['level']}\n"
        f"⭐ <b>Опыт:</b> {format_exp_progress(player['exp'], player['level'])}\n"
        f"🏆 <b>Рейтинг:</b> {player['rating']}\n\n"
        f"❤️ <b>Выносливость:</b> {stamina_stats_invested(player['max_hp'], player['level'])} "
        f"{player['current_hp']}/{player['max_hp']}\n"
        f"💪 <b>Сила:</b> {player['strength']}\n"
        f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
        f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n\n"
        f"💰 <b>Золото:</b> {player['gold']}\n"
        f"💎 <b>Алмазы:</b> {player['diamonds']}\n\n"
        f"🔥 <b>Побед:</b> {player['wins']}\n"
        f"💔 <b>Поражений:</b> {player['losses']}\n\n"
        f"🌟 <b>Улучшения:</b>\n"
        f"⚔️ Сила атаки: {improvements.get('attack_power', 0)}/5\n"
        f"🏃 Уклонение: {improvements.get('dodge', 0)}/5\n"
        f"🛡️ Блоки: {improvements.get('block_mastery', 0)}/5\n"
        f"⚡ Криты: {improvements.get('critical_strike', 0)}/5"
    )

    keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back")]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await CallbackHandlers._callback_set_message(query, stats_text, reply_markup=reply_markup, parse_mode="HTML")


CallbackHandlers.show_stats = staticmethod(show_stats)


async def show_season_info(query, player):
    season = db.get_active_season()
    if not season:
        await CallbackHandlers._callback_set_message(
            query,
            "Сезон не активен.",
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]]),
        )
        return
    lb = db.get_season_leaderboard(season["id"], 5)
    started = str(season["started_at"])[:10]
    text = f"🌟 <b>{html_escape(season['name'])}</b>\n📅 Начало: {started}\n\n🏆 <b>Топ-5 сезона:</b>\n"
    for i, p in enumerate(lb, 1):
        medal = "🥇🥈🥉"[i - 1] if i <= 3 else f"{i}."
        un = html_escape(p.get("username") or "—")
        text += f"{medal} {un} — {p['wins']}W / {p['losses']}L · {p['rating']}⭐\n"
    if not lb:
        text += "Пока никто не сыграл в этом сезоне.\n"
    text += "\n💡 За топ-3 в конце сезона: 100/50/25 💎"
    keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]]
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.show_season_info = staticmethod(show_season_info)


async def show_battle_pass(query, player):
    uid = player["user_id"]
    bp = db.get_battle_pass(uid)
    tiers = db.BATTLE_PASS_TIERS
    claimed = bp.get("last_claimed_tier", 0)
    text = "🎖️ <b>BATTLE PASS</b>\n\nВыполняй задания — получай награды!\n\n"
    keyboard = []
    for i, (b_need, w_need, d, g) in enumerate(tiers, 1):
        b_done = min(bp.get("battles_done", 0), b_need)
        w_done = min(bp.get("wins_done", 0), w_need)
        if i <= claimed:
            status = "✅"
        elif b_done >= b_need and w_done >= w_need:
            status = "🎁 ГОТОВО"
        else:
            status = f"⏳ {b_done}/{b_need}б · {w_done}/{w_need}п"
        text += f"<b>Тир {i}</b> {status}\n  {b_need} боёв + {w_need} побед → +{d}💎 +{g}💰\n\n"
        if i > claimed and b_done >= b_need and w_done >= w_need:
            keyboard.append([InlineKeyboardButton(f"🎁 Забрать Тир {i}", callback_data=f"bp_claim_{i}")])
    keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")])
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.show_battle_pass = staticmethod(show_battle_pass)


async def claim_battle_pass_tier(query, player, tier: int):
    result = db.claim_battle_pass_tier(player["user_id"], tier)
    if result["ok"]:
        await query.answer(f"✅ Тир {tier} получен! +{result['diamonds']}💎 +{result['gold']}💰", show_alert=True)
    else:
        await query.answer(f"❌ {result['reason']}", show_alert=True)
    fresh = db.get_or_create_player(player["user_id"], player.get("username", ""))
    await CallbackHandlers.show_battle_pass(query, fresh)


CallbackHandlers.claim_battle_pass_tier = staticmethod(claim_battle_pass_tier)
