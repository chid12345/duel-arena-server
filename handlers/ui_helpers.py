"""
handlers/ui_helpers.py — определение класса CallbackHandlers с UI-хелперами.
"""

import logging
from html import escape as html_escape
from typing import Optional, Tuple
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from config import *
from database import db
from battle_system import battle_system
from profile_card import generate_profile_card
from handlers.common import tg_api_call, _telegram_message_unchanged

logger = logging.getLogger(__name__)


class CallbackHandlers:
    """Обработчики кнопок"""

    @staticmethod
    def _combat_stats_summary(player: dict) -> str:
        """Строка с реальными % уворота/крита/брони/урона для экрана статов."""
        lv    = int(player.get('level', 1))
        s     = int(player.get('strength', PLAYER_START_STRENGTH))
        agi   = int(player.get('endurance', PLAYER_START_ENDURANCE))
        intu  = int(player.get('crit', PLAYER_START_CRIT))
        mhp   = int(player.get('max_hp', PLAYER_START_MAX_HP))

        # Средний противник того же уровня (равное распределение)
        tf = total_free_stats_at_level(lv)
        avg_agi  = max(1, PLAYER_START_ENDURANCE + tf // 4)
        avg_intu = max(1, PLAYER_START_CRIT      + tf // 4)

        # Уворот против среднего противника
        dodge_pct = min(DODGE_MAX_CHANCE, agi / (agi + avg_agi) * DODGE_MAX_CHANCE) * 100

        # Крит против среднего противника
        crit_pct  = min(CRIT_MAX_CHANCE, intu / (intu + avg_intu) * CRIT_MAX_CHANCE) * 100

        # Броня (точная, только от своих статов)
        stamina   = stamina_stats_invested(mhp, lv)
        armor_pct = min(ARMOR_ABSOLUTE_MAX,
                        stamina / (stamina + ARMOR_STAMINA_K_ABS)) * 100 if stamina > 0 else 0

        # Базовый урон от Силы (текущая формула: flat*lv + scale*str^power)
        dmg = int(STRENGTH_DAMAGE_FLAT_PER_LEVEL * lv + STRENGTH_DAMAGE_SCALE * (s ** STRENGTH_DAMAGE_POWER))

        return (
            f"⚔️ Урон: ~{dmg}  |  🛡 Броня: -{armor_pct:.0f}%\n"
            f"🤸 Уворот: ~{dodge_pct:.0f}%  |  💥 Крит: ~{crit_pct:.0f}%\n"
            f"<i>(уворот и крит — против равного противника)</i>"
        )

    @staticmethod
    def _hp_status_line(player: dict) -> str:
        """Строка HP с инфо о регене. Если не полное — показывает темп и ETA."""
        mh = int(player.get('max_hp', PLAYER_START_MAX_HP))
        ch = int(player.get('current_hp', mh))
        inv = stamina_stats_invested(mh, player.get('level', 1))
        if ch >= mh:
            return f"{ch}/{mh} ✅"
        endurance_mult = 1.0 + inv * HP_REGEN_ENDURANCE_BONUS
        regen_per_min = round(mh / HP_REGEN_BASE_SECONDS * endurance_mult * 60, 1)
        hp_missing = mh - ch
        secs_to_full = int(hp_missing / max(0.001, mh / HP_REGEN_BASE_SECONDS * endurance_mult))
        mins, secs = divmod(secs_to_full, 60)
        eta = f"{mins}м {secs}с" if mins else f"{secs}с"
        return f"{ch}/{mh}  ⏱ +{regen_per_min} HP/мин · полное через {eta}"

    @staticmethod
    def _welcome_html(player: dict, username: str) -> str:
        """Главный экран: профиль, персонаж (эмодзи), статы. HTML."""
        u = html_escape(username or "Боец")
        inv = stamina_stats_invested(player['max_hp'], player['level'])
        return (
            f"{MESSAGES['welcome']}\n\n"
            f"👤 <b>Боец:</b> {u}\n"
            f"📊 <b>Уровень:</b> {player['level']} · 💰 <b>Золото:</b> {player['gold']}\n"
            f"🏆 <b>Рейтинг:</b> {player['rating']}\n\n"
            f"🧍 <b>Ваш персонаж</b>\n"
            f"💪 <b>Сила:</b> {player['strength']}\n"
            f"🤸 <b>Ловкость:</b> {player['endurance']}\n"
            f"💥 <b>Интуиция:</b> {player.get('crit', PLAYER_START_CRIT)}\n"
            f"❤️ <b>Выносливость:</b> {inv} · {CallbackHandlers._hp_status_line(player)}\n\n"
            f"⭐ <b>Опыт:</b> {format_exp_progress(player['exp'], player['level'])}\n"
            f"💎 <b>Алмазы:</b> {player['diamonds']}\n"
            f"🔥 <b>Побед:</b> {player['wins']}\n"
            f"💔 <b>Поражений:</b> {player['losses']}"
        )

    @staticmethod
    async def _send_profile_card(target, player: dict, username: str, reply_markup, is_message=False, extra_text: str = ""):
        """
        Отправить/обновить карточку профиля как фото.
        target: update.message (is_message=True) или query (callback).
        Если фото уже есть — edit_message_media, иначе send_photo / reply_photo.
        """
        from telegram import InputMediaPhoto
        import io

        player = dict(player)
        player.setdefault('username', username)
        img_bytes = generate_profile_card(player)
        caption = extra_text or ""

        if is_message:
            # Команда /start — отправляем новое фото
            try:
                await tg_api_call(
                    target.reply_photo,
                    photo=img_bytes,
                    caption=caption or None,
                    reply_markup=reply_markup,
                    parse_mode='HTML',
                )
            except Exception as e:
                logger.warning("profile_card send failed, fallback to text: %s", e)
                text = CallbackHandlers._welcome_html(player, username)
                await tg_api_call(target.reply_text, text, reply_markup=reply_markup, parse_mode='HTML')
            return

        # Callback — проверяем текущее сообщение
        msg = target.message
        if msg and msg.photo:
            # Уже фото — обновляем через edit_message_media
            try:
                media = InputMediaPhoto(
                    media=img_bytes,
                    caption=caption or None,
                    parse_mode='HTML',
                )
                await tg_api_call(target.edit_message_media, media=media, reply_markup=reply_markup)
                return
            except Exception as e:
                logger.warning("edit_message_media failed: %s", e)
        # Текстовое сообщение — удаляем и шлём фото
        try:
            if msg:
                try:
                    await msg.delete()
                except Exception:
                    pass
            chat_id = msg.chat_id if msg else target.from_user.id
            bot = target.get_bot()
            await tg_api_call(
                bot.send_photo,
                chat_id=chat_id,
                photo=img_bytes,
                caption=caption or None,
                reply_markup=reply_markup,
                parse_mode='HTML',
            )
        except Exception as e:
            logger.warning("profile_card send_photo failed, fallback to text: %s", e)
            text = CallbackHandlers._welcome_html(player, username)
            try:
                await CallbackHandlers._callback_set_message(
                    target, text, reply_markup=reply_markup, parse_mode='HTML',
                )
            except Exception:
                pass

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
                [InlineKeyboardButton("⚔️ Найти соперника", callback_data='find_battle')],
                [InlineKeyboardButton("🤖 Бой с ботом",     callback_data='find_bot_battle')],
                [InlineKeyboardButton("🔄 Обновить",        callback_data='refresh_main')],
                [
                    InlineKeyboardButton("📊 Персонаж",   callback_data='training'),
                    InlineKeyboardButton("📈 Статистика",  callback_data='stats'),
                ],
                [
                    InlineKeyboardButton("🏆 Рейтинг",    callback_data='rating'),
                    InlineKeyboardButton("🌟 Сезон",       callback_data='season_info'),
                ],
                [
                    InlineKeyboardButton("🛒 Магазин",        callback_data='shop'),
                    InlineKeyboardButton("🎖️ Боевой пропуск", callback_data='battle_pass'),
                ],
                [
                    InlineKeyboardButton("🛡️ Клан",         callback_data='clan_menu'),
                    InlineKeyboardButton("🎁 Позвать друга", callback_data='show_invite'),
                ],
                [
                    InlineKeyboardButton("🎭 Гардероб",      callback_data='wardrobe_menu:0'),
                    InlineKeyboardButton("⚙️ Настройки",     callback_data='settings'),
                ],
            ]
        )
        return InlineKeyboardMarkup(rows)

    @staticmethod
    def _stale_battle_markup():
        """Меню, когда бой ещё в памяти, но интерфейс мог зависнуть."""
        rows = [[InlineKeyboardButton("🧹 Сбросить зависший бой", callback_data="battle_abandon")]]
        rows.extend(list(CallbackHandlers._main_menu_markup().inline_keyboard))
        return InlineKeyboardMarkup(rows)

    @staticmethod
    def _battle_status_line(ctx: dict) -> str:
        if ctx.get('waiting_opponent'):
            return "⏳⋯"
        pa = ctx.get('pending_attack')
        pd = ctx.get('pending_defense')
        a_icon = "✓" if pa else "·"
        d_icon = "✓" if pd else "·"
        return f"🗡️{a_icon} · 🛡️{d_icon}"

    @staticmethod
    def _build_battle_screen_html(ctx: dict) -> str:
        st_iv = int(ctx.get('your_stamina_invested', 0))
        line1 = (
            f"❤️ вы {st_iv} {ctx['your_hp']}/{ctx['your_max']} · "
            f"враг {ctx['opp_hp']}/{ctx['opp_max']}"
        )
        line2 = CallbackHandlers._battle_status_line(ctx)
        line3 = (ctx.get('turn_timer_line') or '').strip()
        lines = [line1, line2]
        if line3:
            lines.append(line3)
        return "\n".join(lines)

    @staticmethod
    def _battle_message_html_for_user(user_id: int):
        """Полный HTML сообщения боя (лог + экран) и галочки для клавиатуры."""
        ctx = battle_system.get_battle_ui_context(user_id)
        if not ctx:
            return None
        bid = battle_system.battle_queue.get(user_id)
        battle = battle_system.active_battles.get(bid) if bid else None
        if not battle:
            return None
        prefix = battle.get('ui_message_prefix') or ''
        parts = []
        clog_lines = battle.get('combat_log_lines') or []
        if clog_lines:
            clog = '\n\n'.join(clog_lines)
            parts.append(f"📜 <b>Лог боя</b>\n{clog}")
        parts.append(CallbackHandlers._build_battle_screen_html(ctx))
        body = "\n\n".join(parts)
        text = f"{prefix}{body}" if prefix else body
        return text, ctx.get('pending_attack'), ctx.get('pending_defense')

    @staticmethod
    def _battle_inline_markup(sel_attack=None, sel_defense=None):
        """✅ на выбранных зонах; третья строка — автоход."""
        keys = (('HEAD', 'Голова'), ('TORSO', 'Тело'), ('LEGS', 'Ноги'))
        row1 = [
            InlineKeyboardButton(
                f"{'✅ ' if sel_attack == k else ''}👊 {lab}",
                callback_data=f'attack_{k}',
            )
            for k, lab in keys
        ]
        row2 = [
            InlineKeyboardButton(
                f"{'✅ ' if sel_defense == k else ''}🛡️ {lab}",
                callback_data=f'defend_{k}',
            )
            for k, lab in keys
        ]
        row3 = [
            InlineKeyboardButton("👁️ Разведка", callback_data='battle_opponent_stats'),
            InlineKeyboardButton("🔄",           callback_data='battle_refresh'),
            InlineKeyboardButton("🎲 Авто",      callback_data='battle_auto'),
        ]
        return InlineKeyboardMarkup([row1, row2, row3])

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
        """Обновить chat_id/message_id сообщения боя после delete+send (иначе таймер и PvP push целят в старое)."""
        bid = battle_system.battle_queue.get(user_id)
        if not bid:
            return
        b = battle_system.active_battles.get(bid)
        if not b or not b.get('battle_active'):
            return
        if b.get('is_bot2'):
            battle_system.set_battle_ui_message(user_id, chat_id, message_id)
            return
        p1_uid = b['player1']['user_id']
        if user_id == p1_uid:
            battle_system.set_battle_ui_message(user_id, chat_id, message_id)
        elif b['player2'].get('user_id') == user_id:

    # ── Гардероб / Инвентарь классов ─────────────────────────────────────────

    @staticmethod
    async def wardrobe_menu(query, bot, user_id: int, page: int = 0):
        """Меню гардероба с классами."""
        player = db.get_or_create_player(user_id, query.from_user.username or "")
        
        # Получаем доступные классы
        available_classes = db.get_available_classes_for_user(user_id)
        equipped_class = db.get_equipped_class(user_id)
        
        # Формируем текст
        text = "🎭 <b>Гардероб</b>\n\n"
        
        if equipped_class:
            class_info = db.get_class_info(equipped_class["class_id"])
            if class_info:
                text += f"👑 <b>Текущий класс:</b> {class_info['name']}\n"
                text += f"📊 <b>Бонусы:</b>\n"
                if class_info.get('bonus_strength', 0) > 0:
                    text += f"  • Сила +{class_info['bonus_strength']}\n"
                if class_info.get('bonus_agility', 0) > 0:
                    text += f"  • Ловкость +{class_info['bonus_agility']}\n"
                if class_info.get('bonus_intuition', 0) > 0:
                    text += f"  • Интуиция +{class_info['bonus_intuition']}\n"
                if class_info.get('bonus_endurance', 0) > 0:
                    text += f"  • Выносливость +{class_info['bonus_endurance']}\n"
                if class_info.get('special_bonus'):
                    text += f"  • {class_info['special_bonus']}\n"
        
        text += "\n📦 <b>Ваша коллекция:</b>\n"
        
        # Считаем классы по типам
        total_classes = sum(len(classes) for classes in available_classes.values())
        owned_classes = sum(
            sum(1 for cls in classes if cls.get('owned', False))
            for classes in available_classes.values()
        )
        
        text += f"  • Всего классов: {owned_classes}/{total_classes}\n"
        text += f"  • Бесплатные: {sum(1 for cls in available_classes.get('free', []) if cls.get('owned', False))}/4\n"
        text += f"  • За золото: {sum(1 for cls in available_classes.get('gold', []) if cls.get('owned', False))}/4\n"
        text += f"  • За алмазы: {sum(1 for cls in available_classes.get('diamonds', []) if cls.get('owned', False))}/3\n"
        
        # USDT-образы
        usdt_count = db.get_user_inventory(user_id)
        usdt_count = sum(1 for item in usdt_count if item["class_type"] == "usdt")
        text += f"  • USDT-образы: {usdt_count}\n"
        
        # Клавиатура
        keyboard = []
        
        # Бесплатные классы
        free_classes = available_classes.get('free', [])
        if free_classes:
            keyboard.append([InlineKeyboardButton("🎁 Бесплатные классы", callback_data=f"wardrobe_type:free:{page}")])
        
        # Платные классы за золото
        gold_classes = available_classes.get('gold', [])
        if gold_classes:
            keyboard.append([InlineKeyboardButton("💰 Классы за золото", callback_data=f"wardrobe_type:gold:{page}")])
        
        # Платные классы за алмазы
        diamonds_classes = available_classes.get('diamonds', [])
        if diamonds_classes:
            keyboard.append([InlineKeyboardButton("💎 Классы за алмазы", callback_data=f"wardrobe_type:diamonds:{page}")])
        
        # USDT-образы
        keyboard.append([InlineKeyboardButton("💳 USDT-образы", callback_data=f"wardrobe_type:usdt:{page}")])
        
        # Назад в главное меню
        keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data="main_menu")])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await CallbackHandlers._callback_set_message(
            query, bot, text, reply_markup, parse_mode="HTML"
        )

    @staticmethod
    async def wardrobe_type_menu(query, bot, user_id: int, class_type: str, page: int = 0):
        """Меню классов определённого типа."""
        player = db.get_or_create_player(user_id, query.from_user.username or "")
        available_classes = db.get_available_classes_for_user(user_id)
        
        classes = available_classes.get(class_type, [])
        if not classes:
            await query.answer("Нет классов этого типа")
            return
        
        # Пагинация
        items_per_page = 5
        start_idx = page * items_per_page
        end_idx = start_idx + items_per_page
        page_classes = classes[start_idx:end_idx]
        
        # Текст заголовка
        type_names = {
            "free": "🎁 Бесплатные классы",
            "gold": "💰 Классы за золото", 
            "diamonds": "💎 Классы за алмазы",
            "usdt": "💳 USDT-образы"
        }
        
        text = f"{type_names.get(class_type, 'Классы')}\n\n"
        
        # Отображаем классы на странице
        for i, cls in enumerate(page_classes, start=1):
            idx = start_idx + i
            owned = cls.get('owned', False)
            equipped = cls.get('equipped', False)
            
            if class_type == "usdt":
                # Для USDT-образов показываем кастомное имя
                inventory_item = next(
                    (item for item in db.get_user_inventory(user_id) 
                     if item["class_id"] == cls["class_id"]),
                    None
                )
                display_name = inventory_item.get("custom_name", "Кастомный") if inventory_item else "Кастомный"
            else:
                display_name = cls.get('name', 'Неизвестно')
            
            status = "✅" if owned else "🔒"
            if equipped:
                status = "👑"
            
            price_text = ""
            if not owned and class_type != "usdt":
                if cls.get('price_gold', 0) > 0:
                    price_text = f"💰{cls['price_gold']}"
                elif cls.get('price_diamonds', 0) > 0:
                    price_text = f"💎{cls['price_diamonds']}"
                else:
                    price_text = "Бесплатно"
            
            text += f"{idx}. {status} <b>{display_name}</b>"
            if price_text:
                text += f" ({price_text})"
            text += "\n"
            
            if owned and not equipped:
                text += f"   ↳ <i>Нажмите чтобы надеть</i>\n"
            elif not owned and class_type != "usdt":
                text += f"   ↳ <i>Нажмите чтобы купить</i>\n"
            elif class_type == "usdt":
                text += f"   ↳ <i>Нажмите для управления</i>\n"
        
        # Клавиатура с классами
        keyboard = []
        for i, cls in enumerate(page_classes, start=1):
            idx = start_idx + i - 1
            btn_text = f"{i}. "
            
            if cls.get('equipped', False):
                btn_text += "👑 "
            elif cls.get('owned', False):
                btn_text += "✅ "
            else:
                btn_text += "🔒 "
            
            if class_type == "usdt":
                inventory_item = next(
                    (item for item in db.get_user_inventory(user_id) 
                     if item["class_id"] == cls["class_id"]),
                    None
                )
                display_name = inventory_item.get("custom_name", "Кастомный")[:10] if inventory_item else "Кастомный"
            else:
                display_name = cls.get('name', 'Класс')[:10]
            
            btn_text += display_name
            
            callback_data = f"wardrobe_class:{class_type}:{cls['class_id']}:{page}"
            keyboard.append([InlineKeyboardButton(btn_text, callback_data=callback_data)])
        
        # Пагинация
        nav_buttons = []
        if page > 0:
            nav_buttons.append(InlineKeyboardButton("⬅️ Назад", callback_data=f"wardrobe_type:{class_type}:{page-1}"))
        
        if end_idx < len(classes):
            nav_buttons.append(InlineKeyboardButton("Вперёд ➡️", callback_data=f"wardrobe_type:{class_type}:{page+1}"))
        
        if nav_buttons:
            keyboard.append(nav_buttons)
        
        # Кнопки управления
        if class_type == "usdt":
            keyboard.append([
                InlineKeyboardButton("➕ Создать USDT-образ", callback_data="usdt_create")
            ])
        
        keyboard.append([
            InlineKeyboardButton("⬅️ Назад в гардероб", callback_data="wardrobe_menu:0"),
            InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")
        ])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await CallbackHandlers._callback_set_message(
            query, bot, text, reply_markup, parse_mode="HTML"
        )

    @staticmethod
    async def wardrobe_class_action(query, bot, user_id: int, class_type: str, class_id: str, page: int):
        """Действие с классом (покупка/переключение)."""
        player = db.get_or_create_player(user_id, query.from_user.username or "")
        
        if class_type == "usdt":
            # Управление USDT-образом
            await CallbackHandlers.usdt_class_menu(query, bot, user_id, class_id, page)
            return
        
        # Проверяем, есть ли класс у пользователя
        has_class = db.has_class(user_id, class_id)
        
        if has_class:
            # Переключение на класс
            success, message = db.switch_class(user_id, class_id)
            if success:
                await query.answer(f"Переключен на {message}")
                # Обновляем меню
                await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, class_type, page)
            else:
                await query.answer(message)
        else:
            # Покупка класса
            success, message = db.purchase_class(user_id, class_id)
            if success:
                await query.answer(message)
                # Обновляем меню
                await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, class_type, page)
            else:
                await query.answer(message)

    @staticmethod
    async def usdt_class_menu(query, bot, user_id: int, class_id: str, page: int):
        """Меню управления USDT-образом."""
        player = db.get_or_create_player(user_id, query.from_user.username or "")
        
        # Получаем информацию о USDT-образе
        inventory = db.get_user_inventory(user_id)
        usdt_item = next((item for item in inventory if item["class_id"] == class_id), None)
        
        if not usdt_item:
            await query.answer("USDT-образ не найден")
            return
        
        text = f"💳 <b>USDT-образ</b>\n\n"
        text += f"📛 <b>Название:</b> {usdt_item.get('custom_name', 'Кастомный')}\n"
        text += f"📅 <b>Создан:</b> {usdt_item.get('purchased_at', 'Неизвестно')}\n\n"
        
        # Сохранённые статы
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
        
        text += "<i>USDT-образы сохраняют распределение статов и позволяют мгновенно переключаться между разными билдами.</i>"
        
        # Клавиатура
        keyboard = []
        
        if usdt_item.get('equipped', False):
            keyboard.append([InlineKeyboardButton("👑 Экипирован", callback_data="noop")])
        else:
            keyboard.append([InlineKeyboardButton("🎭 Надеть", callback_data=f"usdt_equip:{class_id}:{page}")])
        
        keyboard.append([
            InlineKeyboardButton("💾 Сохранить статы", callback_data=f"usdt_save:{class_id}:{page}"),
            InlineKeyboardButton("✏️ Переименовать", callback_data=f"usdt_rename:{class_id}:{page}")
        ])
        
        keyboard.append([
            InlineKeyboardButton("⬅️ Назад", callback_data=f"wardrobe_type:usdt:{page}"),
            InlineKeyboardButton("🏠 Главное меню", callback_data="main_menu")
        ])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await CallbackHandlers._callback_set_message(
            query, bot, text, reply_markup, parse_mode="HTML"
        )

    @staticmethod
    async def usdt_create_action(query, bot, user_id: int):
        """Создание нового USDT-образа."""
        player = db.get_or_create_player(user_id, query.from_user.username or "")
        
        # В реальном проекте здесь была бы интеграция с платежной системой
        # Для демо просто создаём USDT-образ
        
        success, message, new_class_id = db.create_usdt_class(user_id)
        if success:
            await query.answer(f"USDT-образ создан: {message}")
            # Возвращаемся в меню USDT-образов
            await CallbackHandlers.wardrobe_type_menu(query, bot, user_id, "usdt", 0)
        else:
            await query.answer(message)

    @staticmethod
    async def usdt_equip_action(query, bot, user_id: int, class_id: str, page: int):
        """Экипировка USDT-образа."""
        success, message = db.switch_class(user_id, class_id)
        if success:
            await query.answer(f"Переключен на USDT-образ")
            await CallbackHandlers.usdt_class_menu(query, bot, user_id, class_id, page)
        else:
            await query.answer(message)

    @staticmethod
    async def usdt_save_action(query, bot, user_id: int, class_id: str, page: int):
        """Сохранение статов в USDT-образ."""
        success, message = db.save_usdt_stats(user_id, class_id)
        if success:
            await query.answer("Статы сохранены в USDT-образ")
            await CallbackHandlers.usdt_class_menu(query, bot, user_id, class_id, page)
        else:
            await query.answer(message)
            battle_system.set_battle_p2_ui_message(user_id, chat_id, message_id)
