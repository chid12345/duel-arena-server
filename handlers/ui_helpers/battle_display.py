"""Экран боя: статус, HTML, клавиатура зон."""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from battle_system import battle_system


class CallbackHandlersBattleDisplay:
    @staticmethod
    def _battle_status_line(ctx: dict) -> str:
        if ctx.get("waiting_opponent"):
            return "⏳⋯"
        pa = ctx.get("pending_attack")
        pd = ctx.get("pending_defense")
        a_icon = "✓" if pa else "·"
        d_icon = "✓" if pd else "·"
        return f"🗡️{a_icon} · 🛡️{d_icon}"

    @staticmethod
    def _build_battle_screen_html(ctx: dict) -> str:
        st_iv = int(ctx.get("your_stamina_invested", 0))
        line1 = (
            f"❤️ вы {st_iv} {ctx['your_hp']}/{ctx['your_max']} · "
            f"враг {ctx['opp_hp']}/{ctx['opp_max']}"
        )
        line2 = CallbackHandlersBattleDisplay._battle_status_line(ctx)
        line3 = (ctx.get("turn_timer_line") or "").strip()
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
        prefix = battle.get("ui_message_prefix") or ""
        parts = []
        clog_lines = battle.get("combat_log_lines") or []
        if clog_lines:
            clog = "\n\n".join(clog_lines)
            parts.append(f"📜 <b>Лог боя</b>\n{clog}")
        parts.append(CallbackHandlersBattleDisplay._build_battle_screen_html(ctx))
        body = "\n\n".join(parts)
        text = f"{prefix}{body}" if prefix else body
        return text, ctx.get("pending_attack"), ctx.get("pending_defense")

    @staticmethod
    def _battle_inline_markup(sel_attack=None, sel_defense=None):
        """✅ на выбранных зонах; третья строка — автоход."""
        keys = (("HEAD", "Голова"), ("TORSO", "Тело"), ("LEGS", "Ноги"))
        row1 = [
            InlineKeyboardButton(
                f"{'✅ ' if sel_attack == k else ''}👊 {lab}",
                callback_data=f"attack_{k}",
            )
            for k, lab in keys
        ]
        row2 = [
            InlineKeyboardButton(
                f"{'✅ ' if sel_defense == k else ''}🛡️ {lab}",
                callback_data=f"defend_{k}",
            )
            for k, lab in keys
        ]
        row3 = [
            InlineKeyboardButton("👁️ Разведка", callback_data="battle_opponent_stats"),
            InlineKeyboardButton("🔄", callback_data="battle_refresh"),
            InlineKeyboardButton("🎲 Авто", callback_data="battle_auto"),
        ]
        return InlineKeyboardMarkup([row1, row2, row3])
