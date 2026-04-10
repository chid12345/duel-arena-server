"""Доставка и отображение итога боя."""

import logging
from html import escape as html_escape

from telegram import InputMediaPhoto

from handlers.ui_helpers import CallbackHandlers
from handlers.common import tg_api_call
from database import db
from profile_card import generate_profile_card

logger = logging.getLogger(__name__)


async def _deliver_battle_end_chat(bot, chat_id: int, player: dict, round_result: dict) -> bool:
    """Новое сообщение с итогом боя (старое сообщение недоступно для правки)."""
    summary = CallbackHandlers._battle_end_summary(player, round_result)
    markup = CallbackHandlers._main_menu_markup()
    img_bytes = generate_profile_card(player)
    try:
        await tg_api_call(
            bot.send_photo,
            chat_id=chat_id,
            photo=img_bytes,
            caption=summary,
            reply_markup=markup,
            parse_mode="HTML",
        )
        return True
    except Exception as e:
        logger.warning("_deliver_battle_end_chat: photo failed: %s", e)
    try:
        text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
        await tg_api_call(
            bot.send_message,
            chat_id=chat_id,
            text=text,
            reply_markup=markup,
            parse_mode="HTML",
        )
        return True
    except Exception as e:
        logger.warning("_deliver_battle_end_chat: message failed: %s", e)
    return False


CallbackHandlers._deliver_battle_end_chat = staticmethod(_deliver_battle_end_chat)


async def _show_battle_end(
    target,
    player: dict,
    round_result: dict,
    *,
    is_bot_target=False,
    bot=None,
    chat_id=None,
    message_id=None,
) -> bool:
    """Показать итог боя как карточку профиля."""
    summary = CallbackHandlers._battle_end_summary(player, round_result)
    markup = CallbackHandlers._main_menu_markup()
    img_bytes = generate_profile_card(player)

    if is_bot_target:
        try:
            media = InputMediaPhoto(media=img_bytes, caption=summary, parse_mode="HTML")
            await tg_api_call(
                bot.edit_message_media,
                chat_id=chat_id,
                message_id=message_id,
                media=media,
                reply_markup=markup,
            )
            return True
        except Exception:
            pass
        try:
            text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
            await tg_api_call(
                bot.edit_message_text,
                chat_id=chat_id,
                message_id=message_id,
                text=text,
                reply_markup=markup,
                parse_mode="HTML",
            )
            return True
        except Exception:
            pass
        return await CallbackHandlers._deliver_battle_end_chat(bot, chat_id, player, round_result)

    msg = target.message if target else None
    if msg and msg.photo:
        try:
            media = InputMediaPhoto(media=img_bytes, caption=summary, parse_mode="HTML")
            await tg_api_call(target.edit_message_media, media=media, reply_markup=markup)
            return True
        except Exception:
            pass
    try:
        if msg:
            try:
                await msg.delete()
            except Exception:
                pass
        tg_chat_id = msg.chat_id if msg else target.from_user.id
        bot_obj = target.get_bot()
        await tg_api_call(
            bot_obj.send_photo,
            chat_id=tg_chat_id,
            photo=img_bytes,
            caption=summary,
            reply_markup=markup,
            parse_mode="HTML",
        )
        return True
    except Exception as e:
        logger.warning("_show_battle_end: send_photo failed, text fallback: %s", e)
    text = CallbackHandlers._battle_end_message_with_welcome(player, round_result)
    try:
        await tg_api_call(target.edit_message_text, text, reply_markup=markup, parse_mode="HTML")
        return True
    except Exception:
        return await CallbackHandlers._deliver_battle_end_chat(
            target.get_bot(), target.from_user.id, player, round_result,
        )


CallbackHandlers._show_battle_end = staticmethod(_show_battle_end)


async def _notify_level_up_chat(bot, chat_id: int, user_id: int, round_result: dict):
    """Отдельное сообщение при апе уровня победителем."""
    lvl = round_result.get("level_up_level")
    if not lvl or round_result.get("is_test_battle"):
        return
    if round_result.get("winner_id") != user_id:
        return
    pl = db.get_or_create_player(user_id, "")
    name = html_escape((pl.get("username") or "").strip() or "Игрок")
    await tg_api_call(
        bot.send_message,
        chat_id=chat_id,
        text=f"🎉 {name} достиг {int(lvl)} уровня!",
        parse_mode="HTML",
    )


CallbackHandlers._notify_level_up_chat = staticmethod(_notify_level_up_chat)
