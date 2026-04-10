"""Тонкие обёртки для гардероба (импортируются из battle_core)."""

from handlers.ui_helpers import CallbackHandlers


async def wardrobe_menu_callback(query, bot, user_id: int, page: int = 0):
    await CallbackHandlers.wardrobe_menu(query, bot, user_id, page)


async def wardrobe_type_callback(query, bot, user_id: int, class_type: str, page: int = 0):
    await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, class_type, page)


async def wardrobe_class_callback(query, bot, user_id: int, class_type: str, class_id: str, page: int):
    await CallbackHandlers.wardrobe_class_action(query, bot, user_id, class_type, class_id, page)


async def usdt_create_callback(query, bot, user_id: int):
    await CallbackHandlers.usdt_create_action(query, bot, user_id)


async def usdt_equip_callback(query, bot, user_id: int, class_id: str, page: int):
    await CallbackHandlers.usdt_equip_action(query, bot, user_id, class_id, page)


async def usdt_save_callback(query, bot, user_id: int, class_id: str, page: int):
    await CallbackHandlers.usdt_save_action(query, bot, user_id, class_id, page)
