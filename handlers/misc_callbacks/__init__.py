"""
Патчи CallbackHandlers: магазин, кланы, тренировки, навигация.
Подмодули импортируются для побочного эффекта (привязка staticmethod).

Унификация armor: wardrobe_callbacks удалён — старый бот-«Гардероб» больше
не нужен после унификации брони в mini-app armor_overlay_v2.
"""

from handlers.misc_callbacks import training_rating
from handlers.misc_callbacks import shop
from handlers.misc_callbacks import stats_season_pass
from handlers.misc_callbacks import clan_social
from handlers.misc_callbacks import invite_invoice
from handlers.misc_callbacks import main_refresh

__all__ = [
    "training_rating",
    "shop",
    "stats_season_pass",
    "clan_social",
    "invite_invoice",
    "main_refresh",
]
