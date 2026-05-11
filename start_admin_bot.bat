@echo off
chcp 65001 >nul
echo === Duel Arena Admin Bot ===

REM --- Заполни эти значения ---
set ADMIN_BOT_TOKEN=СЮДА_ТОКЕН_НОВОГО_БОТА
set ANTHROPIC_API_KEY=СЮДА_КЛЮЧ_ANTHROPIC
set ADMIN_USER_IDS=СЮДА_СВОЙ_TELEGRAM_ID

REM Или закомментируй строки выше и создай файл .env.local с этими переменными

if "%ADMIN_BOT_TOKEN%"=="СЮДА_ТОКЕН_НОВОГО_БОТА" (
    echo ОШИБКА: Заполни ADMIN_BOT_TOKEN в start_admin_bot.bat
    pause
    exit /b 1
)

echo Запускаю admin bot...
python admin_bot/bot.py
pause
