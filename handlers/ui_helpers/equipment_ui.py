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
    lines.append(f"💰 У вас: {gold} золота  |  💎 {diamonds} алмазов\n")
    lines.append("<b>Доступные предметы:</b>")

    rows: list[list] = []
    for item in items:
        r_emoji = RARITY_EMOJI.get(item.get("rarity", ""), "")
        price_str = (
            f"{item['price_gold']} 🪙" if item.get("price_gold")
            else f"{item.get('price_diamonds', '?')} 💎"
        )
        lines.append(f"\n{r_emoji} <b>{html_escape(item['name'])}</b> — {html_escape(item.get('desc', ''))}")
        lines.append(f"   Цена: {price_str}")
        is_equipped = (equipped.get(slot, {}) or {}).get("item_id") == item["id"]
        label_btn = "✅ Надето" if is_equipped else f"Надеть ({price_str})"
        rows.append([InlineKeyboardButton(label_btn, callback_data=f"equip_buy:{item['id']}:{slot}")])

    # Unequip button
    if equipped.get(slot):
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

    # Payment
    gold_cost = int(item.get("price_gold", 0))
    diamond_cost = int(item.get("price_diamonds", 0))
    if gold_cost > 0:
        if int(player.get("gold", 0)) < gold_cost:
            await query.answer(f"Недостаточно золота. Нужно {gold_cost} 🪙", show_alert=True)
            return
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?", (gold_cost, user_id, gold_cost))
        ok = cur.rowcount > 0
        conn.commit()
        conn.close()
        if not ok:
            await query.answer("Недостаточно золота.", show_alert=True)
            return
    elif diamond_cost > 0:
        if int(player.get("diamonds", 0)) < diamond_cost:
            await query.answer(f"Недостаточно алмазов. Нужно {diamond_cost} 💎", show_alert=True)
            return
        conn = db.get_connection()
        cur = conn.cursor()
        cur.execute("UPDATE players SET diamonds = diamonds - ? WHERE user_id = ? AND diamonds >= ?", (diamond_cost, user_id, diamond_cost))
        conn.commit()
        conn.close()

    db.equip_item(user_id, slot, item_id)
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
