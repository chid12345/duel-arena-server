"""
Admin Telegram Bot — управление проектом duel-arena-server через Telegram.
Запуск: python admin_bot/bot.py
"""
import asyncio
import logging
import os
import sys
from pathlib import Path

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# Загружаем .env.local если есть
_env_file = ROOT / ".env.local"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        if "=" in _line and not _line.startswith("#"):
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

from admin_bot import agent

logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_BOT_TOKEN = os.getenv("ADMIN_BOT_TOKEN", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
_raw_ids = os.getenv("ADMIN_USER_IDS", "")
ADMIN_IDS = {int(x.strip()) for x in _raw_ids.split(",") if x.strip().isdigit()}


def _check_admin(update: Update) -> bool:
    uid = update.effective_user.id if update.effective_user else None
    return uid in ADMIN_IDS


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_admin(update):
        return
    await update.message.reply_text(
        "Привет! Я управляю проектом duel-arena-server.\n\n"
        "/help — возможности\n/status — версия и последний коммит\n/new — новый диалог"
    )


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_admin(update):
        return
    await update.message.reply_text(
        "Что я умею:\n"
        "• Читать и писать файлы проекта\n"
        "• Делать git commit + push\n"
        "• Запускать python/pytest/git команды\n"
        "• Искать код по паттерну\n"
        "• Отвечать на вопросы об архитектуре\n\n"
        "Просто пиши задачу обычным текстом.\n"
        "/new — сбросить историю диалога"
    )


async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_admin(update):
        return
    from admin_bot.tools import run_command, read_file
    version = read_file("version.py").strip()
    git_log = run_command("git log -3 --oneline")
    await update.message.reply_text(f"📦 version.py:\n{version}\n\n📝 Git:\n{git_log}")


async def cmd_new(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_admin(update):
        return
    session_id = str(update.effective_user.id)
    agent.reset_session(session_id)
    await update.message.reply_text("Диалог сброшен. Начинаем заново.")


async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_admin(update):
        return
    if not update.message or not update.message.text:
        return

    thinking = await update.message.reply_text("⏳ Думаю...")
    session_id = str(update.effective_user.id)

    try:
        reply = await asyncio.get_event_loop().run_in_executor(
            None,
            agent.handle,
            session_id,
            update.message.text,
            ANTHROPIC_API_KEY,
        )
    except Exception as e:
        reply = f"Ошибка: {e}"

    # Telegram ограничение: 4096 символов
    if len(reply) > 4000:
        chunks = [reply[i:i+4000] for i in range(0, len(reply), 4000)]
        await thinking.edit_text(chunks[0])
        for chunk in chunks[1:]:
            await update.message.reply_text(chunk)
    else:
        await thinking.edit_text(reply or "(пустой ответ)")


def main() -> None:
    if not ADMIN_BOT_TOKEN:
        logger.error("ADMIN_BOT_TOKEN не задан")
        sys.exit(1)
    if not ANTHROPIC_API_KEY:
        logger.error("ANTHROPIC_API_KEY не задан")
        sys.exit(1)
    if not ADMIN_IDS:
        logger.error("ADMIN_USER_IDS не задан")
        sys.exit(1)

    app = Application.builder().token(ADMIN_BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("new", cmd_new))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Admin bot started. Admins: %s", ADMIN_IDS)
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
