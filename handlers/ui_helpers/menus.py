"""Главное меню и разметка при «зависшем» бое."""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import WEBAPP_PUBLIC_URL


class CallbackHandlersMenus:
    @staticmethod
    def _main_menu_markup():
        """Главное меню после боя или для возврата (как у /start — с «Обновить»)."""
        rows = []
        if WEBAPP_PUBLIC_URL:
            rows.append(
                [
                    InlineKeyboardButton(
                        "🎮 Mini App",
                        web_app=WebAppInfo(url=WEBAPP_PUBLIC_URL),
                    )
                ]
            )
        rows.extend(
            [
                [InlineKeyboardButton("⚔️ Найти соперника", callback_data="find_battle")],
                [InlineKeyboardButton("🤖 Бой с ботом", callback_data="find_bot_battle")],
                [InlineKeyboardButton("🔄 Обновить", callback_data="refresh_main")],
                [
                    InlineKeyboardButton("📊 Персонаж", callback_data="training"),
                    InlineKeyboardButton("📈 Статистика", callback_data="stats"),
                ],
                [
                    InlineKeyboardButton("🏆 Рейтинг", callback_data="rating"),
                    InlineKeyboardButton("🌟 Сезон", callback_data="season_info"),
                ],
                [
                    InlineKeyboardButton("🛒 Магазин", callback_data="shop"),
                    InlineKeyboardButton("⚙️ Экипировка", callback_data="equipment_menu"),
                ],
                [
                    InlineKeyboardButton("🛡️ Клан", callback_data="clan_menu"),
                    InlineKeyboardButton("🎁 Позвать друга", callback_data="show_invite"),
                ],
            ]
        )
        return InlineKeyboardMarkup(rows)

    @staticmethod
    def _stale_battle_markup():
        """Меню, когда бой ещё в памяти, но интерфейс мог зависнуть."""
        rows = [[InlineKeyboardButton("🧹 Сбросить зависший бой", callback_data="battle_abandon")]]
        rows.extend(list(CallbackHandlersMenus._main_menu_markup().inline_keyboard))
        return InlineKeyboardMarkup(rows)
