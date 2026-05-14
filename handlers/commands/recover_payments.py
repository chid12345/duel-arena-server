"""Админ-команды восстановления потерянных USDT-платежей.

Возникли после критичного бага UnboundLocalError в crypto_webhook (commit d06d6d2):
все USDT-платежи падали в БД со status='pending', items_delivered=0.
После фикса нужно восстановить выдачу уже оплаченных предметов.

Команды (доступны только ADMIN_USER_IDS):
  /lost_payments               — все застрявшие платежи (топ-50)
  /my_lost                     — твои собственные застрявшие
  /recover <invoice_id>        — восстановить один платёж
  /recover_all_my              — восстановить ВСЕ свои потерянные

Безопасность: все операции идемпотентны (см. tools/recover_crypto_invoice.py).
"""

import logging

from telegram import Update
from telegram.ext import ContextTypes

from config import ADMIN_USER_IDS
from handlers.common import tg_api_call
from tools.recover_crypto_invoice import dismiss_user_stuck, list_stuck, recover_one

logger = logging.getLogger(__name__)


def _is_admin(user_id: int) -> bool:
    return user_id in ADMIN_USER_IDS


async def _deny(update: Update) -> None:
    await tg_api_call(
        update.message.reply_text,
        "🚫 Команда только для администраторов.",
    )


def _format_invoice_row(row: dict) -> str:
    iid = row.get("invoice_id")
    uid = row.get("user_id")
    status = row.get("status")
    amount = row.get("amount")
    asset = row.get("asset")
    payload = (row.get("payload") or "")[:30]
    return f"• #{iid} uid={uid} {amount}{asset} [{status}] {payload}"


# Telegram лимит сообщения 4096 символов. Берём с запасом.
_TG_MSG_LIMIT = 3800


def _split_long_message(text: str) -> list[str]:
    """Разбивает длинное сообщение на части по 3800 символов (по строкам)."""
    if len(text) <= _TG_MSG_LIMIT:
        return [text]
    parts, current = [], ""
    for line in text.split("\n"):
        if len(current) + len(line) + 1 > _TG_MSG_LIMIT:
            if current:
                parts.append(current)
            current = line
        else:
            current = (current + "\n" + line) if current else line
    if current:
        parts.append(current)
    return parts


async def _send_long(reply_func, text: str) -> None:
    """Отправляет потенциально длинное сообщение, разбивая на куски при необходимости."""
    for chunk in _split_long_message(text):
        await tg_api_call(reply_func, chunk)


class BotHandlersRecoverPayments:

    @staticmethod
    async def lost_payments_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """/lost_payments — все застрявшие платежи в системе (топ-50)."""
        user = update.effective_user
        if not _is_admin(user.id):
            await _deny(update); return
        try:
            rows = list_stuck()
            if not rows:
                await tg_api_call(update.message.reply_text, "✅ Нет застрявших платежей.")
                return
            # Считаем pending vs paid отдельно — pending часто это просто брошенные счета.
            pending = [r for r in rows if r.get("status") != "paid"]
            paid = [r for r in rows if r.get("status") == "paid"]
            show = (paid[:20] + pending[:20])[:30]
            header = (
                f"📋 Всего {len(rows)}: paid={len(paid)} pending={len(pending)}\n"
                f"Показываю топ {len(show)} (приоритет — paid):"
            )
            lines = [header] + [_format_invoice_row(r) for r in show]
            await _send_long(update.message.reply_text, "\n".join(lines))
        except Exception as e:
            logger.exception("lost_payments error uid=%s: %s", user.id, e)
            await tg_api_call(update.message.reply_text, f"❌ Ошибка: {type(e).__name__}: {e}")

    @staticmethod
    async def my_lost_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """/my_lost — твои собственные застрявшие платежи."""
        user = update.effective_user
        if not _is_admin(user.id):
            await _deny(update); return
        try:
            rows = list_stuck(user.id)
            if not rows:
                await tg_api_call(update.message.reply_text, "✅ У тебя нет потерянных платежей.")
                return
            # Считаем pending (брошенные/не-доставленные) и paid (точно потерянные)
            pending = [r for r in rows if r.get("status") != "paid"]
            paid = [r for r in rows if r.get("status") == "paid"]
            header = (
                f"📋 Всего твоих потерянных: {len(rows)}\n"
                f"  💳 paid (точно потеряны): {len(paid)}\n"
                f"  ⏳ pending (не оплачены или webhook не пришёл): {len(pending)}\n"
            )
            # Приоритет paid; берём топ 30 в сумме чтобы не превысить лимит
            show = (paid[:20] + pending[:20])[:30]
            lines = [header] + [_format_invoice_row(r) for r in show]
            if len(rows) > len(show):
                lines.append(f"\n…и ещё {len(rows) - len(show)} (не помещаются)")
            lines.append("\nЧтобы восстановить — `/recover_all_my` или `/recover <invoice_id>`")
            await _send_long(update.message.reply_text, "\n".join(lines))
        except Exception as e:
            logger.exception("my_lost error uid=%s: %s", user.id, e)
            await tg_api_call(update.message.reply_text, f"❌ Ошибка: {type(e).__name__}: {e}")

    @staticmethod
    async def recover_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """/recover <invoice_id> — восстановить один платёж."""
        user = update.effective_user
        if not _is_admin(user.id):
            await _deny(update); return
        if not context.args or not context.args[0].isdigit():
            await tg_api_call(update.message.reply_text, "Использование: /recover <invoice_id>")
            return
        invoice_id = int(context.args[0])
        try:
            res = recover_one(invoice_id)
        except Exception as e:
            logger.exception("recover %s error uid=%s: %s", invoice_id, user.id, e)
            await tg_api_call(update.message.reply_text, f"❌ Ошибка: {type(e).__name__}: {e}")
            return
        if res.get("ok"):
            msg = (
                f"✅ Восстановлено!\n"
                f"invoice=#{invoice_id} uid={res.get('user_id')}\n"
                f"тип выдачи: {res.get('kind')}"
            )
        else:
            msg = f"❌ Не восстановлено: {res.get('reason')}"
        await tg_api_call(update.message.reply_text, msg)
        logger.info("recover_command uid=%s invoice=%s result=%s", user.id, invoice_id, res)

    @staticmethod
    async def dismiss_my_lost_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """/dismiss_my_lost — пометить все свои застрявшие как доставленные БЕЗ выдачи.

        Используется для очистки списка тестовых платежей. БЕЗОПАСНО: только меняет
        флаг items_delivered=1, никакие предметы НЕ выдаются.
        """
        user = update.effective_user
        if not _is_admin(user.id):
            await _deny(update); return
        try:
            affected = dismiss_user_stuck(user.id)
        except Exception as e:
            logger.exception("dismiss_my_lost error uid=%s: %s", user.id, e)
            await tg_api_call(update.message.reply_text, f"❌ Ошибка: {type(e).__name__}: {e}")
            return
        await tg_api_call(
            update.message.reply_text,
            f"🧹 Помечено как доставленные (без выдачи предметов): {affected}\n"
            f"Список /my_lost теперь должен быть пустым."
        )
        logger.info("dismiss_my_lost uid=%s affected=%s", user.id, affected)

    @staticmethod
    async def recover_all_my_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """/recover_all_my — восстановить ВСЕ свои потерянные платежи."""
        user = update.effective_user
        if not _is_admin(user.id):
            await _deny(update); return
        try:
            rows = list_stuck(user.id)
        except Exception as e:
            logger.exception("recover_all_my list error uid=%s: %s", user.id, e)
            await tg_api_call(update.message.reply_text, f"❌ Ошибка получения списка: {type(e).__name__}: {e}")
            return
        if not rows:
            await tg_api_call(update.message.reply_text, "✅ У тебя нет потерянных платежей.")
            return
        results = []
        ok_count = fail_count = 0
        for r in rows:
            iid = int(r["invoice_id"])
            try:
                res = recover_one(iid)
            except Exception as e:
                logger.exception("recover_all_my recover_one #%s error: %s", iid, e)
                res = {"ok": False, "reason": f"{type(e).__name__}: {e}"}
            if res.get("ok"):
                ok_count += 1
                results.append(f"✅ #{iid} → {res.get('kind')}")
            else:
                fail_count += 1
                results.append(f"❌ #{iid} → {res.get('reason')}")
        summary = (
            f"📊 Восстановлено: {ok_count} | Не удалось: {fail_count}\n\n"
            + "\n".join(results)
        )
        await _send_long(update.message.reply_text, summary)
        logger.info("recover_all_my uid=%s ok=%s fail=%s", user.id, ok_count, fail_count)
