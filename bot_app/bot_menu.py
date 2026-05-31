"""Настройка меню Telegram: команды, описание, кнопка Mini App."""
import logging
from telegram import BotCommand, MenuButtonWebApp, MenuButtonDefault, WebAppInfo
from telegram.ext import Application

from config import WEBAPP_PUBLIC_URL

logger = logging.getLogger(__name__)


async def setup_bot_menu(application: Application):
    """Настроить меню команд Telegram."""
    commands = [
        BotCommand("start", "Главное меню"),
        BotCommand("help", "Справка по игре"),
        BotCommand("stats", "Ваша статистика"),
        BotCommand("rating", "Топ игроков"),
        BotCommand("quests", "Ежедневные квесты"),
        BotCommand("season", "Текущий сезон"),
        BotCommand("pass", "Боевой пропуск"),
        BotCommand("clan", "Кланы"),
        BotCommand("buy", "Купить алмазы"),
        BotCommand("invite", "Пригласить друга"),
        BotCommand("health", "Проверка состояния (админ)"),
    ]
    await application.bot.set_my_commands(commands)

    # Описание бота — Telegram показывает в ПУСТОМ чате до первого /start
    # как «Что умеет этот бот?». Без этого новичок видит зелёные дудлы и пустоту.
    # Short description идёт на страницу бота (под аватаром).
    try:
        await application.bot.set_my_description(
            "⚡ DUEL ARENA — арена дуэлей в Telegram. Сражайся в PvP, штурмуй мировых боссов, "
            "прокачивай воина, объединяйся в кланы. Жми «СТАРТ» — попадёшь в арену."
        )
        await application.bot.set_my_short_description(
            "⚡ Арена дуэлей: PvP, кланы, мировые боссы. Прокачивай воина и иди в Топ-1."
        )
        logger.info("✅ Bot description / short_description обновлены")
    except Exception as e:
        logger.warning("set_my_description failed: %s", e)

    if WEBAPP_PUBLIC_URL:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="🎮 Арена",
                web_app=WebAppInfo(url=WEBAPP_PUBLIC_URL),
            )
        )
        logger.info("✅ Кнопка меню Mini App: %s", WEBAPP_PUBLIC_URL)
    else:
        await application.bot.set_chat_menu_button(menu_button=MenuButtonDefault())
    logger.info("✅ Меню команд Telegram обновлено")
