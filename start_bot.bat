@echo off
chcp 65001 >nul
title ZenDuelArena Bot Launcher

echo ========================================
echo     ZEN DUEL ARENA BOT LAUNCHER
echo ========================================
echo.
echo 🔧 Умный запуск с автоматической очисткой
echo.

REM Проверяем наличие Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python не найден!
    echo 📝 Установите Python с https://python.org
    pause
    exit /b 1
)

REM Проверяем наличие psutil
python -c "import psutil" >nul 2>&1
if errorlevel 1 (
    echo 📦 Установка psutil...
    pip install psutil
    if errorlevel 1 (
        echo ❌ Не удалось установить psutil
        pause
        exit /b 1
    )
)

REM Запускаем умный лаунчер
python launcher.py

echo.
echo Бот остановлен. Нажмите любую клавишу для выхода...
pause >nul
