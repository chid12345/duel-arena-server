"""Замена текста по callback; синк указателя UI боя."""

import logging
from typing import Optional, Tuple

from battle_system import battle_system
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


class CallbackHandlersCallbackEdit:
    @staticmethod
    async def _callback_set_message(
        query,
        text: str,
        *,
        reply_markup=None,
        parse_mode: Optional[str] = "HTML",
    ) -> Tuple[int, int]:
        """
        Заменить текст сообщения по callback. Если сообщение — фото (карточка /start),
        Telegram не даёт edit_message_text: удаляем и шлём новое текстовое.
        Возвращает (chat_id, message_id) для привязки UI боя.
        """
        bot = query.get_bot()
        msg = query.message
        if not msg:
            send_kw = dict(
                chat_id=query.from_user.id,
                text=text,
                reply_markup=reply_markup,
            )
            if parse_mode is not None:
                send_kw["parse_mode"] = parse_mode
            sent = await tg_api_call(bot.send_message, **send_kw)
            return sent.chat_id, sent.message_id
        if msg.photo:
            chat_id = msg.chat_id
            try:
                await tg_api_call(msg.delete)
            except Exception as exc:
                logger.warning("_callback_set_message: delete photo: %s", exc)
            send_kw = dict(chat_id=chat_id, text=text, reply_markup=reply_markup)
            if parse_mode is not None:
                send_kw["parse_mode"] = parse_mode
            sent = await tg_api_call(bot.send_message, **send_kw)
            return sent.chat_id, sent.message_id
        await tg_api_call(query.edit_message_text, text, reply_markup=reply_markup, parse_mode=parse_mode)
        return msg.chat_id, msg.message_id

    @staticmethod
    def _sync_battle_ui_pointer(user_id: int, chat_id: int, message_id: int) -> None:
        """Обновить chat_id/message_id сообщения боя после delete+send."""
        bid = battle_system.battle_queue.get(user_id)
        if not bid:
            return
        b = battle_system.active_battles.get(bid)
        if not b or not b.get("battle_active"):
            return
        if b.get("is_bot2"):
            battle_system.set_battle_ui_message(user_id, chat_id, message_id)
            return
        p1_uid = b["player1"]["user_id"]
        if user_id == p1_uid:
            battle_system.set_battle_ui_message(user_id, chat_id, message_id)
        elif b["player2"].get("user_id") == user_id:
            battle_system.set_battle_ui_message(user_id, chat_id, message_id)
