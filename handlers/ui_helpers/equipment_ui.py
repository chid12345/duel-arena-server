"""UI экипировки: показ слотов, покупка и надевание предметов."""

from __future__ import annotations

import logging
from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from config import *
from database import db
from db_schema.equipment_catalog import (
    ALL_SLOTS, SLOT_LABEL, RARITY_EMOJI, RARITY_LABEL,
    get_items_for_slot, get_item,
    SLOT_RING1, SLOT_RING2,
)
from economy.curves import is_tier_unlocked
from economy.level_pricing import get_item_cost
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)

_BACK_BTN = InlineKeyboardButton("◀️ Назад", callback_data="refresh_main")


def _slot_line(slot: str, equipped: dict) -> str:
    emoji, label = SLOT_LABEL[slot]
    item = equipped.get(slot)
    if not item:
        return f"{emoji} {label}: <i>пусто</i>"
    r_emoji = RARITY_EMOJI.get(item.get("rarity", ""), "")
    return f"{emoji} {label}: {r_emoji} {html_escape(item['name'])} — {html_escape(item.get('desc', ''))}"


def equipment_menu_text(user_id: int) -> tuple[str, InlineKeyboardMarkup]:
    equipped = db.get_equipment(user_id)
    lines = ["⚙️ <b>Экипировка</b>\n"]
    for slot in ALL_SLOTS:
        lines.append(_slot_line(slot, equipped))

    # Stats summary
    stats = db.get_equipment_stats(user_id)
    lines.append("\n<b>Суммарные бонусы от экипировки:</b>")
    if stats["atk_bonus"]:
        lines.append(f"⚔️ Урон: +{stats['atk_bonus']}")
    if stats["def_pct"]:
        lines.append(f"🛡 Броня: -{stats['def_pct']*100:.0f}%")
    if stats["hp_bonus"]:
        lines.append(f"❤️ HP: +{stats['hp_bonus']}")
    if stats["crit_bonus"]:
        lines.append(f"💥 Интуиция: +{stats['crit_bonus']}")
    if not any(stats.values()):
        lines.append("<i>Нет экипировки — наденьте предметы</i>")

    rows = []
    for slot in ALL_SLOTS:
        emoji, label = SLOT_LABEL[slot]
        rows.append([InlineKeyboardButton(f"{emoji} {label}", callback_data=f"equip_slot:{slot}")])
    rows.append([_BACK_BTN])
    return "\n".join(lines), InlineKeyboardMarkup(rows)


def slot_shop_text(user_id: int, slot: str) -> tuple[str, InlineKeyboardMarkup]:
    emoji, label = SLOT_LABEL[slot]
    equipped = db.get_equipment(user_id)
    player = db.get_player(user_id)
    gold = int(player.get("gold", 0)) if player else 0
    diamonds = int(player.get("diamonds", 0)) if player else 0

    current = equipped.get(slot) or equipped.get(SLOT_RING1 if slot == SLOT_RING2 else slot)
    lines = [f"{emoji} <b>{label}</b>\n"]
    if current:
        r_emoji = RARITY_EMOJI.get(current.get("rarity", ""), "")
        lines.append(f"Надето: {r_emoji} {html_escape(current['name'])}\n")
    else:
        lines.append("Надето: <i>пусто</i>\n")

    items = get_items_for_slot(slot)
    player_level = int(player.get("level", 1)) if player else 1
    lines.append(f"💰 У вас: {gold} золота  |  💎 {diamonds} алмазов\n")
    lines.append("<b>Доступные предметы:</b>")

    _CUR_SYMBOL = {"gold": "🪙", "diamond": "💎", "star": "⭐"}
    rows: list[list] = []
    for item in items:
        r_emoji = RARITY_EMOJI.get(item.get("rarity", ""), "")
        cost, currency = get_item_cost(item)
        price_str = f"{cost} {_CUR_SYMBOL.get(currency, currency)}"
        # Tier-блокировка по уровню
        item_tier = item.get("tier")
        locked = bool(item_tier) and not is_tier_unlocked(player_level, item_tier)
        rec_lvl = item.get("recommended_level")
        suffix = f" 🔒 c {rec_lvl} ур." if locked and rec_lvl else ""
        lines.append(f"\n{r_emoji} <b>{html_escape(item['name'])}</b>{suffix} — {html_escape(item.get('desc', ''))}")
        lines.append(f"   Цена: {price_str}")
        is_equipped = (equipped.get(slot, {}) or {}).get("item_id") == item["id"]
        if is_equipped:
            label_btn = "✅ Надето"
        elif locked:
            label_btn = f"🔒 c {rec_lvl} ур."
        else:
            label_btn = f"Надеть ({price_str})"
        rows.append([InlineKeyboardButton(label_btn, callback_data=f"equip_buy:{item['id']}:{slot}")])

    # Unequip + Upgrade buttons (этап 4E)
    eq_item = equipped.get(slot)
    if eq_item:
        eq_id = eq_item.get("item_id")
        if eq_id and eq_item.get("tier"):
            cur_plus = db.get_item_plus(user_id, eq_id) if hasattr(db, "get_item_plus") else 0
            rows.append([InlineKeyboardButton(
                f"🔨 Прокачать (+{cur_plus})",
                callback_data=f"upgrade_menu:{eq_id}",
            )])
        rows.append([InlineKeyboardButton("❌ Снять", callback_data=f"equip_remove:{slot}")])
    rows.append([InlineKeyboardButton("◀️ Назад", callback_data="equipment_menu")])
    return "\n".join(lines), InlineKeyboardMarkup(rows)


async def handle_equipment_menu(query, user_id: int) -> None:
    text, markup = equipment_menu_text(user_id)
    await tg_api_call(
        query.edit_message_text,
        text=text,
        reply_markup=markup,
        parse_mode="HTML",
    )


async def handle_equip_slot(query, user_id: int, slot: str) -> None:
    text, markup = slot_shop_text(user_id, slot)
    await tg_api_call(
        query.edit_message_text,
        text=text,
        reply_markup=markup,
        parse_mode="HTML",
    )


async def handle_equip_buy(query, user_id: int, item_id: str, slot: str) -> None:
    item = get_item(item_id)
    if not item:
        await query.answer("Предмет не найден.", show_alert=True)
        return

    player = db.get_player(user_id)
    if not player:
        await query.answer("Игрок не найден.", show_alert=True)
        return

    # Check if already equipped (no cost)
    equipped = db.get_equipment(user_id)
    already = equipped.get(slot, {}) or {}
    if already.get("item_id") == item_id:
        await query.answer("Уже надето!", show_alert=False)
        return

    # Tier-блокировка по уровню (новая логика, этап 3D)
    item_tier = item.get("tier")
    if item_tier and not is_tier_unlocked(int(player.get("level", 1)), item_tier):
        rec = item.get("recommended_level", "?")
        await query.answer(f"🔒 Нужен {rec} ур. для {item_tier}", show_alert=True)
        return

    # Цена через формулу (с fallback на legacy price_*)
    cost, currency = get_item_cost(item)
    _SYM = {"gold": "🪙", "diamond": "💎", "star": "⭐"}
    if cost <= 0:
        # Бесплатный предмет (например стартовый) — пропускаем оплату
        pass
    elif currency == "gold":
        if int(player.get("gold", 0)) < cost:
            await query.answer(f"Недостаточно золота. Нужно {cost} 🪙", show_alert=True)
            return
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?", (cost, user_id, cost))
        ok = cur.rowcount > 0
        conn.commit()
        conn.close()
        if not ok:
            await query.answer("Недостаточно золота.", show_alert=True)
            return
    elif currency == "diamond":
        if int(player.get("diamonds", 0)) < cost:
            await query.answer(f"Недостаточно алмазов. Нужно {cost} 💎", show_alert=True)
            return
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE players SET diamonds = diamonds - ? WHERE user_id = ? AND diamonds >= ?", (cost, user_id, cost))
        conn.commit()
        conn.close()
    else:
        # star — покупка только через TMA / payment, не через бота
        await query.answer(f"⭐ Эта вещь покупается за звёзды через /buy", show_alert=True)
        return

    db.equip_item(user_id, slot, item_id, force=(slot in ("ring1", "ring2")))
    await query.answer(f"✅ {item['name']} надето!", show_alert=False)

    # Refresh slot view
    text, markup = slot_shop_text(user_id, slot)
    await tg_api_call(
        query.edit_message_text,
        text=text,
        reply_markup=markup,
        parse_mode="HTML",
    )


async def handle_equip_remove(query, user_id: int, slot: str) -> None:
    db.unequip_item(user_id, slot)
    await query.answer("Предмет снят.", show_alert=False)
    text, markup = slot_shop_text(user_id, slot)
    await tg_api_call(
        query.edit_message_text,
        text=text,
        reply_markup=markup,
        parse_mode="HTML",
    )
