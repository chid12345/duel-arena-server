"""Диспетчер callback-кнопок."""

import logging

from telegram import Update
from telegram.ext import ContextTypes
from telegram.error import BadRequest

from handlers.ui_helpers import CallbackHandlers
from handlers.common import RateLimiter, _telegram_message_unchanged
from database import db

logger = logging.getLogger(__name__)


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Основной обработчик callback запросов"""
    query = update.callback_query
    user = update.effective_user

    callback_data = query.data
    is_battle_cb = (
        callback_data.startswith("attack_")
        or callback_data.startswith("defend_")
        or callback_data == "battle_auto"
        or callback_data == "battle_opponent_stats"
        or callback_data == "battle_refresh"
    )
    if not is_battle_cb:
        try:
            await query.answer()
        except Exception:
            pass

    if not RateLimiter.is_allowed(user.id, "callback", 0.5):
        try:
            await query.answer("⏳ Слишком много нажатий. Подождите.", show_alert=False)
        except Exception:
            pass
        return

    player = db.get_or_create_player(user.id, user.username)

    try:
        if callback_data == "find_battle":
            await CallbackHandlers.find_battle(query, player)
        elif callback_data == "battle_abandon":
            await CallbackHandlers.handle_battle_abandon(query, player)
        elif callback_data == "training":
            await CallbackHandlers.show_training(query, player)
        elif callback_data == "rating":
            await CallbackHandlers.show_rating(query, player)
        elif callback_data == "shop":
            await CallbackHandlers.show_shop(query, player)
        elif callback_data == "shop_weapons":
            await CallbackHandlers.show_shop_category(query, player, "weapons")
        elif callback_data == "shop_armor":
            await CallbackHandlers.show_shop_category(query, player, "armor")
        elif callback_data == "shop_consumables":
            await CallbackHandlers.show_shop_category(query, player, "consumables")
        elif callback_data == "shop_premium":
            await CallbackHandlers.show_shop_category(query, player, "premium")
        elif callback_data == "stats":
            await CallbackHandlers.show_stats(query, player)
        elif callback_data == "back_to_main":
            await CallbackHandlers.back_to_main(query, player)
        elif callback_data == "back":
            await CallbackHandlers.back(query, player)
        elif callback_data == "refresh_main":
            await CallbackHandlers.refresh_main(query, player)
        elif callback_data == "claim_daily_quest":
            await CallbackHandlers.claim_daily_quest(query, player)
        elif callback_data == "season_info":
            await CallbackHandlers.show_season_info(query, player)
        elif callback_data == "battle_pass":
            await CallbackHandlers.show_battle_pass(query, player)
        elif callback_data.startswith("bp_claim_"):
            tier = int(callback_data.split("_")[-1])
            await CallbackHandlers.claim_battle_pass_tier(query, player, tier)
        elif callback_data == "clan_menu":
            await CallbackHandlers.show_clan_menu(query, player)
        elif callback_data == "clan_create_prompt":
            await CallbackHandlers.clan_create_prompt(query, player)
        elif callback_data.startswith("clan_join_"):
            cid = int(callback_data.split("_")[-1])
            await CallbackHandlers.clan_join(query, player, cid)
        elif callback_data == "clan_leave":
            await CallbackHandlers.clan_leave(query, player)
        elif callback_data.startswith("clan_view_"):
            cid = int(callback_data.split("_")[-1])
            await CallbackHandlers.clan_view(query, cid)
        elif callback_data == "pvp_cancel":
            await CallbackHandlers.pvp_cancel(query, player)
        elif callback_data == "pvp_bot_fallback":
            await CallbackHandlers.pvp_bot_fallback(query, player)
        elif callback_data == "show_invite":
            await CallbackHandlers.show_invite_inline(query, player, context)
        elif callback_data.startswith("wardrobe_menu:"):
            try:
                page = int(callback_data.split(":")[1])
                from handlers.misc_callbacks import wardrobe_menu_callback

                await wardrobe_menu_callback(query, context.bot, user.id, page)
            except Exception as e:
                logger.error("wardrobe_menu error: %s", e)
                await query.answer("Ошибка открытия гардероба")
        elif callback_data.startswith("wardrobe_type:"):
            try:
                _, class_type, page_str = callback_data.split(":")
                page = int(page_str)
                from handlers.misc_callbacks import wardrobe_type_callback

                await wardrobe_type_callback(query, context.bot, user.id, class_type, page)
            except Exception as e:
                logger.error("wardrobe_type error: %s", e)
                await query.answer("Ошибка открытия типа классов")
        elif callback_data.startswith("wardrobe_class:"):
            try:
                _, class_type, class_id, page_str = callback_data.split(":")
                page = int(page_str)
                from handlers.misc_callbacks import wardrobe_class_callback

                await wardrobe_class_callback(query, context.bot, user.id, class_type, class_id, page)
            except Exception as e:
                logger.error("wardrobe_class error: %s", e)
                await query.answer("Ошибка действия с классом")
        elif callback_data == "usdt_create":
            from handlers.misc_callbacks import usdt_create_callback

            await usdt_create_callback(query, context.bot, user.id)
        elif callback_data.startswith("usdt_equip:"):
            try:
                _, class_id, page_str = callback_data.split(":")
                page = int(page_str)
                from handlers.misc_callbacks import usdt_equip_callback

                await usdt_equip_callback(query, context.bot, user.id, class_id, page)
            except Exception as e:
                logger.error("usdt_equip error: %s", e)
                await query.answer("Ошибка экипировки Легендарный образа")
        elif callback_data.startswith("usdt_save:"):
            try:
                _, class_id, page_str = callback_data.split(":")
                page = int(page_str)
                from handlers.misc_callbacks import usdt_save_callback

                await usdt_save_callback(query, context.bot, user.id, class_id, page)
            except Exception as e:
                logger.error("usdt_save error: %s", e)
                await query.answer("Ошибка сохранения статов")
        elif callback_data == "stars_buy_premium":
            await CallbackHandlers.send_premium_invoice(query, player, context)
        elif callback_data.startswith("stars_buy_"):
            parts = callback_data.split("_")
            diamonds, stars = int(parts[2]), int(parts[3])
            await CallbackHandlers.send_stars_invoice(query, player, context, diamonds, stars)
        elif callback_data.startswith("train_"):
            await CallbackHandlers.handle_training(query, player, callback_data.replace("train_", ""))
        elif callback_data.startswith("buy_"):
            await CallbackHandlers.handle_shop_purchase(query, player, callback_data.replace("buy_", ""))
        elif callback_data == "battle_opponent_stats":
            await CallbackHandlers.show_battle_opponent_stats(query, user.id)
        elif callback_data == "battle_refresh":
            await CallbackHandlers.handle_battle_refresh(query, user.id)
        elif callback_data == "battle_auto":
            await CallbackHandlers.handle_battle_auto(query, user.id)
        elif callback_data.startswith("attack_"):
            await CallbackHandlers.handle_battle_choice(query, user.id, callback_data)
        elif callback_data.startswith("defend_"):
            await CallbackHandlers.handle_battle_choice(query, user.id, callback_data)
        else:
            await CallbackHandlers._callback_set_message(query, "❌ Неизвестное действие")

    except BadRequest as e:
        if _telegram_message_unchanged(e):
            return
        logger.exception("BadRequest in callback handler")
        try:
            await CallbackHandlers._callback_set_message(query, "❌ Произошла ошибка. Попробуйте снова.")
        except Exception:
            pass
    except Exception as e:
        logger.exception("Error in callback handler: %s", e)
        try:
            await CallbackHandlers._callback_set_message(query, "❌ Произошла ошибка. Попробуйте снова.")
        except Exception:
            pass


CallbackHandlers.handle_callback = staticmethod(handle_callback)
