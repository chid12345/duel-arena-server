"""Команда /start."""

import asyncio
import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from telegram import Update

from config import *
from database import db
from battle_system import battle_system
from handlers.common import RateLimiter
from handlers.ui_helpers import CallbackHandlers

logger = logging.getLogger(__name__)


class BotHandlersStart:
    @staticmethod
    async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /start"""
        user = update.effective_user
        if not RateLimiter.is_allowed(user.id, "command_start", 1.0):
            await update.message.reply_text("⏳ Слишком часто. Подождите немного.")
            return
        logger.info("event=command_start user_id=%s", user.id)
        db.log_metric_event("command_start", user.id)

        player = await asyncio.to_thread(db.get_or_create_player, user.id, user.username)

        if update.effective_chat:
            db.update_chat_id(user.id, update.effective_chat.id)

        if context.args:
            ref_code = context.args[0]
            if ref_code.startswith("ref_"):
                try:
                    ok_ref, referrer_uid = db.register_referral(user.id, ref_code)
                    logger.info(
                        "event=register_referral user_id=%s ref_code=%s ok=%s referrer=%s",
                        user.id, ref_code, ok_ref, referrer_uid,
                    )
                    if ok_ref and referrer_uid is not None:
                        from handlers.commands import BotHandlers

                        await BotHandlers.notify_referrer_join(context.bot, referrer_uid, user)
                        # Реферал мог КУПИТЬ Premium ещё до того, как зашёл по ссылке
                        # (на момент оплаты реферера не было → комиссия не начислялась).
                        # Доплачиваем задним числом и уведомляем реферера. Идемпотентно.
                        try:
                            ref_pay = await asyncio.to_thread(db.reconcile_premium_referral, user.id)
                            if ref_pay.get("ok") and ref_pay.get("reward_usdt"):
                                await BotHandlers.notify_referrer_premium_reward(context.bot, ref_pay)
                        except Exception as _rec_exc:
                            logger.error("reconcile_premium_referral error uid=%s: %s", user.id, _rec_exc)
                except Exception as _ref_exc:
                    logger.error(
                        "event=register_referral_error user_id=%s ref_code=%s error=%s",
                        user.id, ref_code, _ref_exc,
                    )

        # ─── Новичок: первый /start ───
        # У новичка статы пустые (lv1, 0 побед), а 10 кнопок меню сбивают с толку.
        # Показываем ТОЛЬКО короткое описание игры + одну большую кнопку
        # «⚡ ВОЙТИ В АРЕНУ» (запуск Mini App). После первого захода игрок
        # перестаёт быть новичком (_is_new=False), при следующем /start увидит
        # обычное меню со своей карточкой.
        if player.get("_is_new"):
            welcome_text = (
                "⚡ <b>DUEL ARENA</b> ⚡\n"
                "━━━━━━━━━━━━━━━━━━\n\n"
                "▸ Место, где сражаются <b>тысячи бойцов</b>.\n"
                "▸ Дуэли · Кланы · Мировые боссы · Рейтинг.\n\n"
                "Жми <b>«⚡ ВОЙТИ В АРЕНУ»</b> — попадёшь в первый бой."
            )
            kbd = None
            if WEBAPP_PUBLIC_URL:
                kbd = InlineKeyboardMarkup([[
                    InlineKeyboardButton(
                        "⚡ ВОЙТИ В АРЕНУ",
                        web_app=WebAppInfo(url=WEBAPP_PUBLIC_URL),
                    )
                ]])
            await update.message.reply_text(welcome_text, reply_markup=kbd, parse_mode="HTML")
            return

        endurance_inv = stamina_stats_invested(
            player.get("max_hp", PLAYER_START_MAX_HP), player.get("level", 1)
        )
        regen_result = await asyncio.to_thread(db.apply_hp_regen, user.id, endurance_inv)
        if regen_result:
            player = dict(player)
            player["current_hp"] = regen_result["current_hp"]

        daily_bonus = await asyncio.to_thread(db.check_daily_bonus, user.id)

        if not battle_system.get_battle_status(user.id):
            pending = battle_system.peek_battle_end_ui(user.id)
            if pending:
                adapted = CallbackHandlers._adapt_result_for_user(pending, user.id)
                ok = await CallbackHandlers._deliver_battle_end_chat(
                    context.bot,
                    update.effective_chat.id,
                    player,
                    adapted,
                )
                if ok:
                    battle_system.clear_battle_end_ui(user.id)
                    await CallbackHandlers._notify_level_up_chat(
                        context.bot,
                        update.effective_chat.id,
                        user.id,
                        adapted,
                    )
                    if daily_bonus["can_claim"]:
                        bonus_line = f"🎁 <b>Ежедневный бонус!</b> +{daily_bonus['bonus']} золота"
                        if daily_bonus["streak"] % 7 == 0:
                            bonus_line += f" и +{DIAMONDS_DAILY_STREAK} 💎"
                        await update.message.reply_text(bonus_line, parse_mode="HTML")
                    return

        # Подсказки в подписи к карточке (только для возвращающегося —
        # новичок ушёл раньше через _is_new branch).
        extra_text = ""
        if battle_system.get_battle_status(user.id):
            extra_text = (
                "⚔️ <b>Бой ещё идёт на сервере</b> (в фоне).\n"
                "Прокрутите чат к сообщению с кнопками удара/блока или нажмите «Сбросить»."
            )
        elif battle_system.peek_battle_end_ui(user.id):
            extra_text = "📋 <b>Есть итог прошлого боя</b> — нажмите «🔄 Обновить», чтобы увидеть."
        if daily_bonus["can_claim"]:
            bonus_line = f"🎁 <b>Ежедневный бонус!</b> +{daily_bonus['bonus']} золота"
            if daily_bonus["streak"] % 7 == 0:
                bonus_line += f" и +{DIAMONDS_DAILY_STREAK} 💎"
            extra_text = (extra_text + "\n" + bonus_line).strip()

        menu_rows = list(CallbackHandlers._main_menu_markup().inline_keyboard)
        if battle_system.get_battle_status(user.id):
            keyboard = [
                [InlineKeyboardButton("🧹 Сбросить зависший бой", callback_data="battle_abandon")]
            ] + menu_rows
        else:
            keyboard = menu_rows
        reply_markup = InlineKeyboardMarkup(keyboard)

        await CallbackHandlers._send_profile_card(
            update.message,
            player,
            user.username or "",
            reply_markup,
            is_message=True,
            extra_text=extra_text,
        )
