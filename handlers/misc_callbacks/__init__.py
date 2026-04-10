"""
Патчи CallbackHandlers: магазин, кланы, тренировки, навигация.
Подмодули импортируются для побочного эффекта (привязка staticmethod).
"""

from handlers.misc_callbacks import training_rating
from handlers.misc_callbacks import shop
from handlers.misc_callbacks import stats_season_pass
from handlers.misc_callbacks import clan_social
from handlers.misc_callbacks import invite_invoice
from handlers.misc_callbacks import main_refresh
from handlers.misc_callbacks import wardrobe_callbacks

from handlers.misc_callbacks.wardrobe_callbacks import (
    usdt_create_callback,
    usdt_equip_callback,
    usdt_save_callback,
    wardrobe_class_callback,
    wardrobe_menu_callback,
    wardrobe_type_callback,
)

__all__ = [
    "usdt_create_callback",
    "usdt_equip_callback",
    "usdt_save_callback",
    "wardrobe_class_callback",
    "wardrobe_menu_callback",
    "wardrobe_type_callback",
    "training_rating",
    "shop",
    "stats_season_pass",
    "clan_social",
    "invite_invoice",
    "main_refresh",
    "wardrobe_callbacks",
]
