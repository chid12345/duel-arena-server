"""Тренировка статов и экран рейтинга (патчи CallbackHandlers)."""

from datetime import datetime, timedelta
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
from config import *
from database import db
from repositories.shop.seasons import SEASON_DURATION_DAYS


async def show_training(query, player):
    """Экран распределения статов (меню «Статы»)."""
    free_stats = player.get("free_stats", 0)

    vyn_inv = stamina_stats_invested(player["max_hp"], player["level"])
    combat_summary = CallbackHandlers._combat_stats_summary(player)
    training_text = (
        f"📊 <b>СТАТЫ</b>\n\n"
        f"🔢 <b>Свободных статов:</b> {free_stats}\n\n"
        f"💪 <b>Сила:</b> {player['strength']}\n"
        f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
        f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n"
        f"❤️ <b>Выносливость:</b> {vyn_inv} вложено · "
        f"{player['current_hp']}/{player['max_hp']} HP\n\n"
        f"<b>— В бою —</b>\n"
        f"{combat_summary}\n\n"
        f"💰 <b>Улучшения за золото:</b>\n"
        f"Сила атаки: от 1000 · Уклонение: от 1500\n"
        f"Блоки: от 1200 · Криты: от 2000"
    )

    keyboard = []

    if free_stats > 0:
        keyboard.extend(
            [
                [InlineKeyboardButton(f"💪 Сила +1  ({free_stats} очков)", callback_data="train_strength")],
                [InlineKeyboardButton(f"🤸 Ловкость +1  ({free_stats} очков)", callback_data="train_endurance")],
                [InlineKeyboardButton(f"💥 Интуиция +1  ({free_stats} очков)", callback_data="train_crit_stat")],
                [
                    InlineKeyboardButton(
                        f"❤️ Выносливость +{STAMINA_PER_FREE_STAT}  ({free_stats} очков)",
                        callback_data="train_hp",
                    )
                ],
            ]
        )

    keyboard.extend(
        [
            [InlineKeyboardButton("⚔️ Атака · улучшить", callback_data="train_attack_power")],
            [InlineKeyboardButton("🏃 Уклон · улучшить", callback_data="train_dodge")],
            [InlineKeyboardButton("🛡️ Блок · улучшить", callback_data="train_block")],
            [InlineKeyboardButton("⚡ Крит · улучшить", callback_data="train_critical")],
            [InlineKeyboardButton("⬅️ Назад", callback_data="back")],
        ]
    )

    reply_markup = InlineKeyboardMarkup(keyboard)
    await CallbackHandlers._callback_set_message(
        query, training_text, reply_markup=reply_markup, parse_mode="HTML",
    )


CallbackHandlers.show_training = staticmethod(show_training)


async def handle_training(query, player, training_type):
    """Обработать тренировку"""
    free_stats = player.get("free_stats", 0)

    if training_type in ["strength", "endurance", "hp", "crit_stat"]:
        if free_stats <= 0:
            await query.answer("❌ Нет свободных статов!")
            return

        stats_update = {}

        if training_type == "strength":
            stats_update = {"strength": player["strength"] + 1}
            message = "💪 Сила увеличена на +1!"
        elif training_type == "endurance":
            stats_update = {"endurance": player["endurance"] + 1}
            message = "🤸 Ловкость увеличена на +1!"
        elif training_type == "crit_stat":
            stats_update = {"crit": player.get("crit", PLAYER_START_CRIT) + 1}
            message = "💥 Крит увеличен на +1!"
        elif training_type == "hp":
            inc = STAMINA_PER_FREE_STAT
            stats_update = {
                "max_hp": player["max_hp"] + inc,
                "current_hp": player["current_hp"] + inc,
            }
            message = f"❤️ Выносливость увеличена: +{inc} к пулу!"

        stats_update["free_stats"] = free_stats - 1
        db.update_player_stats(player["user_id"], stats_update)

        await query.answer(message)
        await CallbackHandlers.show_training(
            query, db.get_or_create_player(player["user_id"], player["username"]),
        )

    else:
        type_map = {
            "block": "block_mastery",
            "critical": "critical_strike",
        }
        imp_key = type_map.get(training_type, training_type)

        improvement_costs = {
            "attack_power": 1000,
            "dodge": 1500,
            "block_mastery": 1200,
            "critical_strike": 2000,
        }

        cost = improvement_costs.get(imp_key, 1000)

        if player["gold"] < cost:
            await query.answer(f"❌ Недостаточно золота! Нужно: {cost}")
            return

        success = db.upgrade_improvement(player["user_id"], imp_key)

        if success:
            await query.answer("✅ Улучшение куплено!")
            await CallbackHandlers.show_training(
                query, db.get_or_create_player(player["user_id"], player["username"]),
            )
        else:
            await query.answer("❌ Не удалось улучшить (максимальный уровень?)")


CallbackHandlers.handle_training = staticmethod(handle_training)


def _season_days_left(started_at_str: str) -> int:
    """Дней до конца сезона (0 если истёк)."""
    try:
        started = datetime.fromisoformat(str(started_at_str)[:19].replace(" ", "T"))
        ends = started + timedelta(days=SEASON_DURATION_DAYS)
        delta = (ends - datetime.utcnow()).days
        return max(0, delta)
    except Exception:
        return 0


async def show_rating(query, player):
    """Показать рейтинг — сезонный топ с наградами."""
    season = db.get_active_season()

    if not season:
        text = "🏆 <b>Рейтинг Арены</b>\n\nСезон скоро начнётся. Следи за обновлениями!"
        keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back")]]
        await CallbackHandlers._callback_set_message(
            query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
        )
        return

    top = db.get_season_leaderboard(season["id"], 10)
    days_left = _season_days_left(season["started_at"])

    text = (
        f"🏆 <b>{season['name']}</b>\n"
        f"⏳ До конца сезона: <b>{days_left} дн.</b>\n\n"
    )

    if top:
        for i, p in enumerate(top, 1):
            medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
            total = (p["wins"] or 0) + (p["losses"] or 0)
            wr = p["wins"] / total * 100 if total > 0 else 0
            text += f"{medal} {p['username']}\n"
            text += f"   ⭐ {p['rating']} · 🔥 {p['wins']}П · 📈 {wr:.0f}%\n\n"
    else:
        text += "Никто ещё не сыграл в этом сезоне.\n\n"

    text += (
        "🎁 <b>Награды топа:</b>\n"
        "🥇 500💰 + 200💎\n"
        "🥈 300💰 + 120💎\n"
        "🥉 200💰 + 75💎\n"
        "4–10: 50💰 + 20💎"
    )

    keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back")]]
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.show_rating = staticmethod(show_rating)
