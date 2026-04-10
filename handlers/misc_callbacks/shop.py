"""Магазин в боте (патчи CallbackHandlers)."""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from handlers.ui_helpers import CallbackHandlers
from config import *
from database import db


async def show_shop(query, player):
    """Показать магазин — только рабочие товары."""
    boost_charges = player.get("xp_boost_charges", 0) or 0
    text = (
        f"🛒 <b>МАГАЗИН</b>\n\n"
        f"🪙 Золото: <b>{player['gold']}</b>  |  💎 Алмазы: <b>{player['diamonds']}</b>\n\n"
        f"<b>🧪 Зелья и бусты:</b>\n"
        f"• 🧪 Малое зелье HP · <b>60🪙</b> — восстановить 30% HP\n"
        f"• ⚗️ Большое зелье HP · <b>200🪙</b> — полное восстановление HP\n"
        f"• 💊 XP ×1.5 · <b>400🪙</b> — двойной опыт на 5 боёв"
        f" (у вас: {boost_charges} зарядов)\n\n"
        f"<b>💎 Премиум:</b>\n"
        f"• 🔄 Сброс характеристик · <b>{RESET_STATS_COST_DIAMONDS}💎</b> — вернуть все свободные статы\n"
        f"• 💎 Купить алмазы / Premium → /buy\n\n"
        f"<i>⚔️ Оружие и броня — скоро</i>"
    )
    from config import PREMIUM_SUBSCRIPTION_STARS

    keyboard = [
        [
            InlineKeyboardButton("🧪 Малое зелье · 60🪙", callback_data="buy_hp_potion_small"),
            InlineKeyboardButton("⚗️ Зелье HP · 200🪙", callback_data="buy_hp_potion"),
        ],
        [InlineKeyboardButton("💊 XP ×1.5 · 400🪙", callback_data="buy_xp_boost")],
        [InlineKeyboardButton(f"🔄 Сброс статов · {RESET_STATS_COST_DIAMONDS}💎", callback_data="buy_stat_reset")],
        [
            InlineKeyboardButton(
                f"👑 Premium · {PREMIUM_SUBSCRIPTION_STARS}⭐",
                callback_data="stars_buy_premium",
            )
        ],
        [InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")],
    ]
    await CallbackHandlers._callback_set_message(
        query, text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="HTML",
    )


CallbackHandlers.show_shop = staticmethod(show_shop)


async def show_shop_category(query, player, category: str):
    """Редиректим в общий магазин — категории пока не разделены."""
    await CallbackHandlers.show_shop(query, player)


CallbackHandlers.show_shop_category = staticmethod(show_shop_category)


async def handle_shop_purchase(query, player, item_key: str):
    """Обработка покупок из магазина."""
    from handlers.commands import BotHandlers

    uid = player["user_id"]
    ref_r: dict = {}
    purchase_ok = False
    if item_key == "hp_potion":
        result = db.buy_hp_potion(uid)
        if result["ok"]:
            purchase_ok = True
            hp_r = result["hp_restored"]
            msg = f"✅ HP восстановлен! +{hp_r} HP (−30 золота)" if hp_r > 0 else "❤️ HP уже полный! −30 золота"
            ref_r = db.process_referral_vip_shop_purchase(uid, gold=30)
        else:
            msg = f"❌ {result['reason']}"
    elif item_key == "xp_boost":
        result = db.buy_xp_boost(uid)
        msg = f"✅ XP-буст: +5 зарядов куплено! (−100 золота)" if result["ok"] else f"❌ {result['reason']}"
        if result.get("ok"):
            purchase_ok = True
            ref_r = db.process_referral_vip_shop_purchase(uid, gold=100)
    elif item_key == "stat_reset":
        result = db.buy_stat_reset(uid)
        msg = (
            f"✅ Статы сброшены! {result['free_stats']} свободных очков для распределения."
            if result["ok"]
            else f"❌ {result['reason']}"
        )
        if result.get("ok"):
            purchase_ok = True
            ref_r = db.process_referral_vip_shop_purchase(uid, diamonds=RESET_STATS_COST_DIAMONDS)
    else:
        msg = "❌ Товар не найден"
    await query.answer(msg, show_alert=True)
    if purchase_ok:
        await BotHandlers.notify_referrer_gold_shop(query.get_bot(), uid, item_key, ref_r)
    fresh_player = db.get_or_create_player(uid, player.get("username", ""))
    await CallbackHandlers.show_shop(query, fresh_player)


CallbackHandlers.handle_shop_purchase = staticmethod(handle_shop_purchase)
