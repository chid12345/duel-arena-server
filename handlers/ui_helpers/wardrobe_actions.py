"""Гардероб: действия с классом и USDT-образами."""

from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from database import db


class CallbackHandlersWardrobeActions:
    @staticmethod
    async def wardrobe_class_action(query, bot, user_id: int, class_type: str, class_id: str, page: int):
        """Действие с классом (покупка/переключение)."""
        db.get_or_create_player(user_id, query.from_user.username or "")

        if class_type == "usdt":
            from handlers.ui_helpers import CallbackHandlers

            await CallbackHandlers.usdt_class_menu(query, bot, user_id, class_id, page)
            return

        has_class = db.has_class(user_id, class_id)

        if has_class:
            success, message = db.switch_class(user_id, class_id)
            if success:
                await query.answer(f"Переключен на {message}")
                from handlers.ui_helpers import CallbackHandlers

                await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, class_type, page)
            else:
                await query.answer(message)
        else:
            success, message = db.purchase_class(user_id, class_id)
            if success:
                await query.answer(message)
                from handlers.ui_helpers import CallbackHandlers

                await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, class_type, page)
            else:
                await query.answer(message)

    @staticmethod
    async def usdt_class_menu(query, bot, user_id: int, class_id: str, page: int):
        """Меню управления USDT-образом."""
        db.get_or_create_player(user_id, query.from_user.username or "")

        inventory = db.get_user_inventory(user_id)
        usdt_item = next((item for item in inventory if item["class_id"] == class_id), None)

        if not usdt_item:
            await query.answer("USDT-образ не найден")
            return

        name = html_escape(str(usdt_item.get("custom_name", "Кастомный")))
        text = "💳 <b>USDT-образ</b>\n\n"
        text += f"📛 <b>Название:</b> {name}\n"
        text += f"📅 <b>Создан:</b> {html_escape(str(usdt_item.get('purchased_at', 'Неизвестно')))}\n\n"

        text += "<b>Сохранённые статы:</b>\n"
        text += f"  • Сила: {usdt_item.get('strength_saved', 0)}\n"
        text += f"  • Ловкость: {usdt_item.get('agility_saved', 0)}\n"
        text += f"  • Интуиция: {usdt_item.get('intuition_saved', 0)}\n"
        text += f"  • Выносливость: {usdt_item.get('endurance_saved', 0)}\n"
        text += f"  • Свободные статы: {usdt_item.get('free_stats_saved', 0)}\n\n"

        text += "<b>Бонусы USDT-образа:</b>\n"
        text += "  • Выносливость +5\n"
        text += "  • 19 свободных статов\n"
        text += "  • Сброс статов на 50% дешевле\n\n"

        text += (
            "<i>USDT-образы сохраняют распределение статов и позволяют мгновенно "
            "переключаться между разными билдами.</i>"
        )

        keyboard = []

        if usdt_item.get("equipped", False):
            keyboard.append([InlineKeyboardButton("👑 Экипирован", callback_data="noop")])
        else:
            keyboard.append([InlineKeyboardButton("🎭 Надеть", callback_data=f"usdt_equip:{class_id}:{page}")])

        keyboard.append(
            [
                InlineKeyboardButton("💾 Сохранить статы", callback_data=f"usdt_save:{class_id}:{page}"),
                InlineKeyboardButton("✏️ Переименовать", callback_data=f"usdt_rename:{class_id}:{page}"),
            ]
        )

        keyboard.append(
            [
                InlineKeyboardButton("⬅️ Назад", callback_data=f"wardrobe_type:usdt:{page}"),
                InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu"),
            ]
        )

        reply_markup = InlineKeyboardMarkup(keyboard)

        from handlers.ui_helpers import CallbackHandlers

        await CallbackHandlers._callback_set_message(
            query, text, reply_markup=reply_markup, parse_mode="HTML",
        )

    @staticmethod
    async def usdt_create_action(query, bot, user_id: int):
        """Создание нового USDT-образа."""
        db.get_or_create_player(user_id, query.from_user.username or "")

        success, message, _new_class_id = db.create_usdt_class(user_id)
        if success:
            await query.answer(f"USDT-образ создан: {message}")
            from handlers.ui_helpers import CallbackHandlers

            await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, "usdt", 0)
        else:
            await query.answer(message)

    @staticmethod
    async def usdt_equip_action(query, bot, user_id: int, class_id: str, page: int):
        """Экипировка USDT-образа."""
        success, message = db.switch_class(user_id, class_id)
        if success:
            await query.answer("Переключен на USDT-образ")
            from handlers.ui_helpers import CallbackHandlers

            await CallbackHandlers.usdt_class_menu(query, bot, user_id, class_id, page)
        else:
            await query.answer(message)

    @staticmethod
    async def usdt_save_action(query, bot, user_id: int, class_id: str, page: int):
        """Сохранение статов в USDT-образ."""
        success, message = db.save_usdt_stats(user_id, class_id)
        if success:
            await query.answer("Статы сохранены в USDT-образ")
            from handlers.ui_helpers import CallbackHandlers

            await CallbackHandlers.usdt_class_menu(query, bot, user_id, class_id, page)
        else:
            await query.answer(message)
