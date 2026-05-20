"""UI апгрейда предметов в боте (Этап 4E)."""

from __future__ import annotations

import logging
import random
from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from database import db
from db_schema.equipment_catalog import get_item, get_item_stats, RARITY_EMOJI
from economy.level_pricing import shop_price
from economy.upgrades_formulas import (
    can_attempt_upgrade,
    cost_to_upgrade_gold,
    dismantle_shards_for,
    plus_stats_for,
    shards_cost_for,
    success_chance,
)
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)


def _stats_short(stats: dict) -> str:
    """Краткая строка боевых статов: «+atk +crit +hp ...»."""
    parts = []
    if int(stats.get("atk_bonus", 0)): parts.append(f"+{int(stats['atk_bonus'])} атк")
    if int(stats.get("hp_bonus", 0)):  parts.append(f"+{int(stats['hp_bonus'])} HP")
    if int(stats.get("crit_bonus", 0)): parts.append(f"+{int(stats['crit_bonus'])} крит")
    if float(stats.get("def_pct", 0)):  parts.append(f"-{float(stats['def_pct'])*100:.0f}%")
    if int(stats.get("dodge_bonus", 0)): parts.append(f"+{int(stats['dodge_bonus'])}% уворот")
    return ", ".join(parts) or "—"


def upgrade_menu_text(user_id: int, item_id: str) -> tuple[str, InlineKeyboardMarkup]:
    """Меню апгрейда: текущий +N, стоимость следующего шага, кнопки."""
    item = get_item(item_id)
    if not item:
        return "❌ Предмет не найден", InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="equipment_menu")]])

    tier = item.get("tier")
    if not tier:
        return (
            f"❌ Legacy предмет {html_escape(item['name'])} не апгрейдится",
            InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="equipment_menu")]]),
        )

    current_plus = db.get_item_plus(user_id, item_id)
    base_stats = get_item_stats(item_id)
    current_stats = plus_stats_for(base_stats, current_plus, tier=tier) if current_plus > 0 else base_stats
    r_emoji = RARITY_EMOJI.get(item.get("rarity", ""), "")
    player = db.get_player(user_id) or {}
    gold = int(player.get("gold", 0))
    shards_have = db.get_shards(user_id, tier)

    lines = [f"🔨 <b>Апгрейд</b> {r_emoji} {html_escape(item['name'])} +{current_plus}\n"]
    lines.append(f"<b>Текущие статы:</b> {_stats_short(current_stats)}")
    lines.append(f"<b>Тир:</b> {tier}  |  💰 {gold}🪙  |  💠 {shards_have} шардов {tier}\n")

    rows = []
    ok_attempt, reason = can_attempt_upgrade(item, current_plus)
    if ok_attempt:
        target_plus = current_plus + 1
        base_gold = shop_price(item, "gold")
        gold_cost = cost_to_upgrade_gold(base_gold, target_plus)
        shards_cost = shards_cost_for(target_plus)
        chance = success_chance(target_plus)
        next_stats = plus_stats_for(base_stats, target_plus, tier=tier)
        lines.append(f"<b>Следующий +{target_plus}:</b> {_stats_short(next_stats)}")
        lines.append(f"<b>Стоимость:</b> {gold_cost}🪙  +  {shards_cost} шардов {tier}")
        chance_pct = int(round(chance * 100))
        risk = "" if chance_pct >= 100 else f"  (риск провала {100 - chance_pct}%)"
        lines.append(f"<b>Шанс успеха:</b> {chance_pct}%{risk}")
        rows.append([InlineKeyboardButton(
            f"🔨 Прокачать +{target_plus} ({gold_cost}🪙)",
            callback_data=f"upgrade_do:{item_id}",
        )])
    else:
        lines.append(f"<i>{reason}</i>")

    dismantle_qty = dismantle_shards_for(tier)
    rows.append([InlineKeyboardButton(
        f"♻️ Разобрать → +{dismantle_qty} шардов {tier}",
        callback_data=f"dismantle:{item_id}",
    )])
    rows.append([InlineKeyboardButton("◀️ Назад", callback_data="equipment_menu")])
    return "\n".join(lines), InlineKeyboardMarkup(rows)


async def handle_upgrade_menu(query, user_id: int, item_id: str) -> None:
    text, markup = upgrade_menu_text(user_id, item_id)
    await tg_api_call(query.edit_message_text, text=text, reply_markup=markup, parse_mode="HTML")


async def handle_upgrade_do(query, user_id: int, item_id: str) -> None:
    """Попытка апгрейда. Атомарно: шарды → золото → ролл → запись."""
    item = get_item(item_id)
    if not item or not item.get("tier"):
        await query.answer("Нельзя апгрейдить.", show_alert=True)
        return
    tier = item["tier"]
    current_plus = db.get_item_plus(user_id, item_id)
    ok_attempt, reason = can_attempt_upgrade(item, current_plus)
    if not ok_attempt:
        await query.answer(f"❌ {reason}", show_alert=True)
        return

    target_plus = current_plus + 1
    base_gold = shop_price(item, "gold")
    gold_cost = cost_to_upgrade_gold(base_gold, target_plus)
    shards_cost = shards_cost_for(target_plus)

    if not db.consume_shards(user_id, tier, shards_cost):
        have = db.get_shards(user_id, tier)
        await query.answer(f"Нужно {shards_cost} шардов {tier}, у вас {have}", show_alert=True)
        return

    conn = db.get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE players SET gold = gold - ? WHERE user_id = ? AND gold >= ?",
        (gold_cost, user_id, gold_cost),
    )
    gold_ok = cur.rowcount > 0
    conn.commit()
    conn.close()
    if not gold_ok:
        db.add_shards(user_id, tier, shards_cost)  # рефанд
        await query.answer(f"Недостаточно золота. Нужно {gold_cost}🪙", show_alert=True)
        return

    chance = success_chance(target_plus)
    roll_success = random.random() < chance
    new_plus = db.record_upgrade_attempt(user_id, item_id, gold_cost, shards_cost, roll_success)

    if roll_success:
        await query.answer(f"✅ Успех! +{new_plus}", show_alert=False)
    else:
        await query.answer(f"❌ Провал. +{new_plus} (шанс был {int(chance*100)}%)", show_alert=True)

    text, markup = upgrade_menu_text(user_id, item_id)
    await tg_api_call(query.edit_message_text, text=text, reply_markup=markup, parse_mode="HTML")


async def handle_dismantle(query, user_id: int, item_id: str) -> None:
    """Разборка предмета на шарды. Снимает со слота если надет."""
    item = get_item(item_id)
    if not item or not item.get("tier"):
        await query.answer("Нельзя разобрать.", show_alert=True)
        return
    tier = item["tier"]
    equipped = db.get_equipment(user_id)
    for slot, eq_item in equipped.items():
        if eq_item.get("item_id") == item_id:
            db.unequip_item(user_id, slot)
            break
    shards = dismantle_shards_for(tier)
    db.add_shards(user_id, tier, shards)
    db.reset_item_plus(user_id, item_id)
    await query.answer(f"♻️ Разобран: +{shards} шардов {tier}", show_alert=False)
    # Возврат в меню экипировки
    from handlers.ui_helpers.equipment_ui import equipment_menu_text
    text, markup = equipment_menu_text(user_id)
    await tg_api_call(query.edit_message_text, text=text, reply_markup=markup, parse_mode="HTML")
