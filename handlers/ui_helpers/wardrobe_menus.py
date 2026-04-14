"""Гардероб: главное меню и список классов по типу."""

from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from database import db


class CallbackHandlersWardrobeMenus:
    @staticmethod
    async def wardrobe_menu(query, bot, user_id: int, page: int = 0):
        """Меню гардероба с классами."""
        db.get_or_create_player(user_id, query.from_user.username or "")

        available_classes = db.get_available_classes_for_user(user_id)
        equipped_class = db.get_equipped_class(user_id)

        text = "🎭 <b>Гардероб</b>\n\n"

        if equipped_class:
            class_info = db.get_class_info(equipped_class["class_id"])
            if class_info:
                text += f"👑 <b>Текущий класс:</b> {html_escape(class_info['name'])}\n"
                text += "<b>Бонусы:</b>\n"
                if class_info.get("bonus_strength", 0) > 0:
                    text += f"  • Сила +{class_info['bonus_strength']}\n"
                if class_info.get("bonus_agility", 0) > 0:
                    text += f"  • Ловкость +{class_info['bonus_agility']}\n"
                if class_info.get("bonus_intuition", 0) > 0:
                    text += f"  • Интуиция +{class_info['bonus_intuition']}\n"
                if class_info.get("bonus_endurance", 0) > 0:
                    text += f"  • Выносливость +{class_info['bonus_endurance']}\n"
                if class_info.get("special_bonus"):
                    text += f"  • {html_escape(str(class_info['special_bonus']))}\n"

        text += "\n📦 <b>Ваша коллекция:</b>\n"

        total_classes = sum(len(classes) for classes in available_classes.values())
        owned_classes = sum(
            sum(1 for cls in classes if cls.get("owned", False))
            for classes in available_classes.values()
        )

        text += f"  • Всего классов: {owned_classes}/{total_classes}\n"
        text += f"  • Бесплатные: {sum(1 for cls in available_classes.get('free', []) if cls.get('owned', False))}/4\n"
        text += f"  • За золото: {sum(1 for cls in available_classes.get('gold', []) if cls.get('owned', False))}/4\n"
        text += f"  • За алмазы: {sum(1 for cls in available_classes.get('diamonds', []) if cls.get('owned', False))}/3\n"

        usdt_count = db.get_user_inventory(user_id)
        usdt_count = sum(1 for item in usdt_count if item["class_type"] == "usdt")
        text += f"  • Легендарный образы: {usdt_count}\n"

        keyboard = []

        if available_classes.get("free", []):
            keyboard.append(
                [InlineKeyboardButton("🎁 Бесплатные классы", callback_data=f"wardrobe_type:free:{page}")]
            )
        if available_classes.get("gold", []):
            keyboard.append(
                [InlineKeyboardButton("💰 Классы за золото", callback_data=f"wardrobe_type:gold:{page}")]
            )
        if available_classes.get("diamonds", []):
            keyboard.append(
                [InlineKeyboardButton("💎 Классы за алмазы", callback_data=f"wardrobe_type:diamonds:{page}")]
            )

        keyboard.append([InlineKeyboardButton("💳 Легендарный образы", callback_data=f"wardrobe_type:usdt:{page}")])
        keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data="main_menu")])

        reply_markup = InlineKeyboardMarkup(keyboard)

        from handlers.ui_helpers import CallbackHandlers

        await CallbackHandlers._callback_set_message(
            query, text, reply_markup=reply_markup, parse_mode="HTML",
        )

    @staticmethod
    async def wardrobe_type_menu(query, bot, user_id: int, class_type: str, page: int = 0):
        """Меню классов определённого типа."""
        db.get_or_create_player(user_id, query.from_user.username or "")
        available_classes = db.get_available_classes_for_user(user_id)

        classes = available_classes.get(class_type, [])
        if not classes:
            await query.answer("Нет классов этого типа")
            return

        items_per_page = 5
        start_idx = page * items_per_page
        end_idx = start_idx + items_per_page
        page_classes = classes[start_idx:end_idx]

        type_names = {
            "free": "🎁 Бесплатные классы",
            "gold": "💰 Классы за золото",
            "diamonds": "💎 Классы за алмазы",
            "usdt": "💳 Легендарный образы",
        }

        text = f"{type_names.get(class_type, 'Классы')}\n\n"

        for i, cls in enumerate(page_classes, start=1):
            idx = start_idx + i
            owned = cls.get("owned", False)
            equipped = cls.get("equipped", False)

            if class_type == "usdt":
                inventory_item = next(
                    (item for item in db.get_user_inventory(user_id) if item["class_id"] == cls["class_id"]),
                    None,
                )
                display_name = inventory_item.get("custom_name", "Кастомный") if inventory_item else "Кастомный"
            else:
                display_name = cls.get("name", "Неизвестно")

            status = "✅" if owned else "🔒"
            if equipped:
                status = "👑"

            price_text = ""
            if not owned and class_type != "usdt":
                if cls.get("price_gold", 0) > 0:
                    price_text = f"💰{cls['price_gold']}"
                elif cls.get("price_diamonds", 0) > 0:
                    price_text = f"💎{cls['price_diamonds']}"
                else:
                    price_text = "Бесплатно"

            safe_name = html_escape(str(display_name))
            text += f"{idx}. {status} <b>{safe_name}</b>"
            if price_text:
                text += f" ({price_text})"
            text += "\n"

            if owned and not equipped:
                text += "   ↳ <i>Нажмите чтобы надеть</i>\n"
            elif not owned and class_type != "usdt":
                text += "   ↳ <i>Нажмите чтобы купить</i>\n"
            elif class_type == "usdt":
                text += "   ↳ <i>Нажмите для управления</i>\n"

        keyboard = []
        for i, cls in enumerate(page_classes, start=1):
            btn_text = f"{i}. "

            if cls.get("equipped", False):
                btn_text += "👑 "
            elif cls.get("owned", False):
                btn_text += "✅ "
            else:
                btn_text += "🔒 "

            if class_type == "usdt":
                inventory_item = next(
                    (item for item in db.get_user_inventory(user_id) if item["class_id"] == cls["class_id"]),
                    None,
                )
                display_name = inventory_item.get("custom_name", "Кастомный")[:10] if inventory_item else "Кастомный"
            else:
                display_name = cls.get("name", "Класс")[:10]

            btn_text += display_name

            callback_data = f"wardrobe_class:{class_type}:{cls['class_id']}:{page}"
            keyboard.append([InlineKeyboardButton(btn_text, callback_data=callback_data)])

        nav_buttons = []
        if page > 0:
            nav_buttons.append(
                InlineKeyboardButton("⬅️ Назад", callback_data=f"wardrobe_type:{class_type}:{page-1}")
            )

        if end_idx < len(classes):
            nav_buttons.append(
                InlineKeyboardButton("Вперёд ➡️", callback_data=f"wardrobe_type:{class_type}:{page+1}")
            )

        if nav_buttons:
            keyboard.append(nav_buttons)

        if class_type == "usdt":
            keyboard.append([InlineKeyboardButton("➕ Создать Легендарный образ", callback_data="usdt_create")])

        keyboard.append(
            [
                InlineKeyboardButton("⬅️ Назад в гардероб", callback_data="wardrobe_menu:0"),
                InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu"),
            ]
        )

        reply_markup = InlineKeyboardMarkup(keyboard)

        from handlers.ui_helpers import CallbackHandlers

        await CallbackHandlers._callback_set_message(
            query, text, reply_markup=reply_markup, parse_mode="HTML",
        )
