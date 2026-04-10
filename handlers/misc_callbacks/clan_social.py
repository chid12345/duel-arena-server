"""Кланы в callback-меню (патчи CallbackHandlers)."""

from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
from database import db


async def show_clan_menu(query, player):
    uid = player["user_id"]
    clan_id = player.get("clan_id")
    if clan_id:
        info = db.get_clan_info(clan_id)
        if info:
            c = info["clan"]
            members = info["members"]
            text = (
                f"⚔️ <b>[{html_escape(c['tag'])}] {html_escape(c['name'])}</b>\n"
                f"📊 Уровень клана: {c['level']} · Побед: {c['wins']}\n"
                f"👥 Участников: {len(members)}/20\n\n"
                f"<b>Состав:</b>\n"
            )
            for m in members[:10]:
                role_icon = "👑" if m["role"] == "leader" else "⚔️"
                text += f"{role_icon} {html_escape(m.get('username') or '—')} · ур.{m['level']} · {m['wins']}п\n"
            keyboard = [
                [InlineKeyboardButton("🚪 Покинуть клан", callback_data="clan_leave")],
                [InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")],
            ]
        else:
            text = "⚔️ Информация о клане недоступна."
            keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]]
    else:
        text = (
            "⚔️ <b>КЛАНЫ</b>\n\n"
            "Ты не состоишь в клане.\n\n"
            f"• Создать клан: {db.CLAN_CREATE_COST_GOLD} золота\n"
            "• Или найди клан по тегу через /clan &lt;тег&gt;\n"
        )
        keyboard = [
            [InlineKeyboardButton("🏰 Создать клан", callback_data="clan_create_prompt")],
            [InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")],
        ]
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.show_clan_menu = staticmethod(show_clan_menu)


async def clan_create_prompt(query, player):
    text = (
        "🏰 <b>Создать клан</b>\n\n"
        f"Стоимость: <b>{db.CLAN_CREATE_COST_GOLD} золота</b> (у вас {player['gold']})\n\n"
        "Используй команду:\n"
        "<code>/clan create ИМЯ КЛАНА | ТЕГ</code>\n\n"
        "Пример: <code>/clan create Стальные Волки | SWF</code>\n"
        "(тег 2–4 символа, только латиница)"
    )
    keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="clan_menu")]]
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.clan_create_prompt = staticmethod(clan_create_prompt)


async def clan_join(query, player, clan_id: int):
    result = db.join_clan(player["user_id"], clan_id)
    await query.answer(
        f"✅ Вступил в клан {result.get('clan_name', '')}!" if result["ok"] else f"❌ {result['reason']}",
        show_alert=True,
    )
    fresh = db.get_or_create_player(player["user_id"], player.get("username", ""))
    await CallbackHandlers.show_clan_menu(query, fresh)


CallbackHandlers.clan_join = staticmethod(clan_join)


async def clan_leave(query, player):
    result = db.leave_clan(player["user_id"])
    await query.answer("✅ Покинул клан." if result["ok"] else f"❌ {result['reason']}", show_alert=True)
    if result["ok"]:
        fresh = db.get_or_create_player(player["user_id"], player.get("username", ""))
        await CallbackHandlers.show_clan_menu(query, fresh)


CallbackHandlers.clan_leave = staticmethod(clan_leave)


async def clan_view(query, clan_id: int):
    info = db.get_clan_info(clan_id)
    if not info:
        await query.answer("Клан не найден.", show_alert=True)
        return
    c = info["clan"]
    members = info["members"]
    text = (
        f"⚔️ <b>[{html_escape(c['tag'])}] {html_escape(c['name'])}</b>\n"
        f"📊 Уровень: {c['level']} · Побед: {c['wins']}\n"
        f"👥 {len(members)}/20 участников\n\n"
    )
    for m in members[:8]:
        role_icon = "👑" if m["role"] == "leader" else "⚔️"
        text += f"{role_icon} {html_escape(m.get('username') or '—')} · ур.{m['level']}\n"
    keyboard = [
        [InlineKeyboardButton("➕ Вступить", callback_data=f"clan_join_{clan_id}")],
        [InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")],
    ]
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.clan_view = staticmethod(clan_view)
