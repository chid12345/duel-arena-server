"""UI-хелперы Telegram: класс CallbackHandlers из миксинов (≤200 строк на файл).

Унификация armor (legacy class-системы): wardrobe_menus и wardrobe_actions
удалены — старый бот-меню «Гардероб» с выбором класса воина больше не нужен.
Покупка/смена брони теперь идёт только через mini-app armor_overlay_v2.
"""

from handlers.ui_helpers.profile_ui import CallbackHandlersProfileUi
from handlers.ui_helpers.menus import CallbackHandlersMenus
from handlers.ui_helpers.battle_display import CallbackHandlersBattleDisplay
from handlers.ui_helpers.callback_edit import CallbackHandlersCallbackEdit


class CallbackHandlers(
    CallbackHandlersCallbackEdit,
    CallbackHandlersBattleDisplay,
    CallbackHandlersMenus,
    CallbackHandlersProfileUi,
):
    """Обработчики кнопок."""

    pass


__all__ = ["CallbackHandlers"]
