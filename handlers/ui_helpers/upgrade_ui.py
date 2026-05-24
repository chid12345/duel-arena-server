"""UI апгрейда предметов в боте (система v2, без шардов)."""

from __future__ import annotations

import logging
import random
from html import escape as html_escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from database import db
from db_schema.equipment_catalog import get_item, get_item_stats, RARITY_EMOJI
from economy.upgrades_formulas import (
    can_attempt_upgrade,
    free_roll_chance,
    free_roll_eligible,
    free_roll_max_per_item,
    plus_stats_for,
    upgrade_cost,
)
from handlers.common import tg_api_call

logger = logging.getLogger(__name__)

_CUR_ICON = {"gold": "🪙", "diamond": "💎"}


def _stats_short(stats: dict) -> str:
    """Краткая строка боевых статов: «+atk +crit +hp ...»."""
    parts = []
    if int(stats.get("atk_bonus", 0)): parts.append(f"+{int(stats['atk_bonus'])} атк")
    if int(stats.get("hp_bonus", 0)):  parts.append(f"+{int(stats['hp_bonus'])} HP")
    if int(stats.get("crit_bonus", 0)): parts.append(f"+{int(stats['crit_bonus'])} крит")
    if float(stats.get("def_pct", 0)):  parts.append(f"-{float(stats['def_pct'])*100:.0f}%")
    if int(stats.get("dodge_bonus", 0)): parts.append(f"+{int(stats['dodge_bonus'])}% уворот")
    return ", ".join(parts) or "—"


def _charge(user_id: int, amount: int, currency: str) -> bool:
    """Атомарно списать золото/алмазы. False если недостаточно."""
    if amount <= 0:
        return True
    col = "diamonds" if currency == "diamond" else "gold"  # whitelist
    conn = db.get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE players SET {col} = {col} - ? WHERE user_id = ? AND {col} >= ?",
            (int(amount), user_id, int(amount)),
        )
        ok = cur.rowcount > 0
        conn.commit()
        return ok
    finally:
        conn.close()


def upgrade_menu_text(user_id: int, item_id: str) -> tuple[str, InlineKeyboardMarkup]:
    """Меню апгрейда: текущий +N, стоимость и эффект следующего шага."""
    back = InlineKeyboardMarkup([[InlineKeyboardButton("◀️ Назад", callback_data="equipment_menu")]])
    item = get_item(item_id)
    if not item:
        return "❌ Предмет не найден", back
    tier = item.get("tier")
    if not tier:
        return f"❌ {html_escape(item['name'])} не улучшается (legacy)", back

    player = db.get_player(user_id) or {}
    level = int(player.get("level", 1))
    gold = int(player.get("gold", 0))
    diamonds = int(player.get("diamonds", 0))
    current_plus = db.get_item_plus(user_id, item_id)
    base_stats = get_item_stats(item_id)
    current_stats = plus_stats_for(base_stats, current_plus, tier=tier) if current_plus > 0 else base_stats
    r_emoji = RARITY_EMOJI.get(item.get("rarity", ""), "")

    lines = [f"🔧 <b>Улучшение</b> {r_emoji} {html_escape(item['name'])} +{current_plus}\n"]
    lines.append(f"<b>Сейчас:</b> {_stats_short(current_stats)}")
    lines.append(f"💰 {gold}🪙   💎 {diamonds}\n")

    rows = []
    ok_attempt, reason = can_attempt_upgrade(item, current_plus, level)
    if ok_attempt:
        target_plus = current_plus + 1
        amount, currency = upgrade_cost(tier, target_plus)
        icon = _CUR_ICON.get(currency, "🪙")
        next_stats = plus_stats_for(base_stats, target_plus, tier=tier)
        lines.append(f"<b>Станет +{target_plus}:</b> {_stats_short(next_stats)}")
        lines.append(f"<b>Цена:</b> {amount}{icon}")
        free_used = db.get_item_free_used(user_id, item_id)
        if free_roll_eligible(target_plus, free_used):
            chance = int(round(free_roll_chance() * 100))
            left = free_roll_max_per_item() - free_used
            lines.append(f"🎁 Шанс {chance}% улучшить <b>бесплатно</b> (осталось {left})")
        rows.append([InlineKeyboardButton(
            f"🔧 Улучшить +{target_plus} ({amount}{icon})",
            callback_data=f"upgrade_do:{item_id}",
        )])
    else:
        lines.append(f"<i>{reason}</i>")

    rows.append([InlineKeyboardButton("◀️ Назад", callback_data="equipment_menu")])
    return "\n".join(lines), InlineKeyboardMarkup(rows)


async def handle_upgrade_menu(query, user_id: int, item_id: str) -> None:
    text, markup = upgrade_menu_text(user_id, item_id)
    await tg_api_call(query.edit_message_text, text=text, reply_markup=markup, parse_mode="HTML")


async def handle_upgrade_do(query, user_id: int, item_id: str) -> None:
    """Улучшение на +1. Гарантированно. Списывает золото/алмазы, либо бесплатно."""
    item = get_item(item_id)
    if not item or not item.get("tier"):
        await query.answer("Нельзя улучшить.", show_alert=True)
        return
    tier = item["tier"]
    player = db.get_player(user_id) or {}
    level = int(player.get("level", 1))
    current_plus = db.get_item_plus(user_id, item_id)
    ok_attempt, reason = can_attempt_upgrade(item, current_plus, level)
    if not ok_attempt:
        await query.answer(f"❌ {reason}", show_alert=True)
        return

    target_plus = current_plus + 1
    amount, currency = upgrade_cost(tier, target_plus)
    icon = _CUR_ICON.get(currency, "🪙")
    free_used = db.get_item_free_used(user_id, item_id)
    is_free = free_roll_eligible(target_plus, free_used) and random.random() < free_roll_chance()

    if not is_free and not _charge(user_id, amount, currency):
        await query.answer(f"❌ Недостаточно. Нужно {amount}{icon}", show_alert=True)
        return

    gold_spent = amount if (not is_free and currency == "gold") else 0
    diamonds_spent = amount if (not is_free and currency == "diamond") else 0
    new_plus = db.record_upgrade(
        user_id, item_id, gold_spent=gold_spent, diamonds_spent=diamonds_spent,
        free_added=1 if is_free else 0,
    )

    if is_free:
        await query.answer(f"🎁 Удача! Улучшение бесплатно → +{new_plus}", show_alert=True)
    else:
        await query.answer(f"✅ Улучшено! +{new_plus} (−{amount}{icon})", show_alert=False)

    text, markup = upgrade_menu_text(user_id, item_id)
    await tg_api_call(query.edit_message_text, text=text, reply_markup=markup, parse_mode="HTML")
