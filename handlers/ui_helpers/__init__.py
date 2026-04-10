"""UI-хелперы Telegram: класс CallbackHandlers из миксинов (≤200 строк на файл)."""

from handlers.ui_helpers.profile_ui import CallbackHandlersProfileUi
from handlers.ui_helpers.menus import CallbackHandlersMenus
from handlers.ui_helpers.battle_display import CallbackHandlersBattleDisplay
from handlers.ui_helpers.callback_edit import CallbackHandlersCallbackEdit
from handlers.ui_helpers.wardrobe_menus import CallbackHandlersWardrobeMenus
from handlers.ui_helpers.wardrobe_actions import CallbackHandlersWardrobeActions


class CallbackHandlers(
    CallbackHandlersWardrobeActions,
    CallbackHandlersWardrobeMenus,
    CallbackHandlersCallbackEdit,
    CallbackHandlersBattleDisplay,
    CallbackHandlersMenus,
    CallbackHandlersProfileUi,
):
    """Обработчики кнопок."""

    pass


__all__ = ["CallbackHandlers"]
