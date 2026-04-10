"""Команда /clan."""

from html import escape as html_escape

from telegram.ext import ContextTypes
from telegram import Update

from database import db
from handlers.common import tg_api_call


class BotHandlersClan:
    @staticmethod
    async def clan_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Команда /clan [create ИМЯ | ТЕГ] | [join ID] | [search ТЕКСТ]"""
        user = update.effective_user
        db.get_or_create_player(user.id, user.username)
        args = context.args or []

        if not args:
            player = db.get_or_create_player(user.id, user.username)
            cid = player.get("clan_id")
            if cid:
                info = db.get_clan_info(cid)
                if info:
                    c = info["clan"]
                    members = info["members"]
                    text = (
                        f"⚔️ <b>[{html_escape(c['tag'])}] {html_escape(c['name'])}</b>\n"
                        f"👥 {len(members)}/20 участников · Уровень {c['level']}\n\n"
                    )
                    for m in members[:10]:
                        icon = "👑" if m["role"] == "leader" else "⚔️"
                        text += f"{icon} {html_escape(m.get('username') or '—')} · ур.{m['level']} · {m['wins']}п\n"
                    await tg_api_call(update.message.reply_text, text, parse_mode="HTML")
                    return
            await tg_api_call(
                update.message.reply_text,
                "⚔️ Используй:\n/clan create ИМЯ | ТЕГ — создать\n/clan join ID — вступить\n/clan search ТЕКСТ — найти\n/clan leave — покинуть",
            )
            return

        sub = args[0].lower()

        if sub == "create":
            raw = " ".join(args[1:])
            if "|" not in raw:
                await tg_api_call(update.message.reply_text, "❌ Формат: /clan create ИМЯ КЛАНА | ТЕГ")
                return
            name, tag = [x.strip() for x in raw.split("|", 1)]
            player = db.get_or_create_player(user.id, user.username)
            result = db.create_clan(user.id, name, tag)
            if result["ok"]:
                await tg_api_call(
                    update.message.reply_text,
                    f"🏰 Клан <b>[{html_escape(result['tag'])}] {html_escape(result['name'])}</b> создан!\n"
                    f"Стоимость: {db.CLAN_CREATE_COST_GOLD} золота списано.",
                    parse_mode="HTML",
                )
            else:
                await tg_api_call(update.message.reply_text, f"❌ {result['reason']}")

        elif sub == "join":
            try:
                cid = int(args[1])
            except (IndexError, ValueError):
                await tg_api_call(update.message.reply_text, "❌ Формат: /clan join ID")
                return
            result = db.join_clan(user.id, cid)
            msg = (
                f"✅ Вступил в клан {result.get('clan_name', '')}!"
                if result["ok"]
                else f"❌ {result['reason']}"
            )
            await tg_api_call(update.message.reply_text, msg)

        elif sub == "leave":
            result = db.leave_clan(user.id)
            await tg_api_call(
                update.message.reply_text,
                "✅ Покинул клан." if result["ok"] else f"❌ {result['reason']}",
            )

        elif sub == "search":
            q = " ".join(args[1:])
            if not q:
                await tg_api_call(update.message.reply_text, "❌ Укажи тег или название: /clan search ТЕКСТ")
                return
            clans = db.search_clans(q)
            if not clans:
                await tg_api_call(update.message.reply_text, "Кланы не найдены.")
                return
            text = "🔍 <b>Результаты поиска:</b>\n\n"
            for c in clans:
                text += (
                    f"[{html_escape(c['tag'])}] {html_escape(c['name'])} — "
                    f"{c['member_count']}/20 · /clan join {c['id']}\n"
                )
            await tg_api_call(update.message.reply_text, text, parse_mode="HTML")

        else:
            await tg_api_call(update.message.reply_text, "❌ Неизвестная подкоманда. /clan — список команд.")
