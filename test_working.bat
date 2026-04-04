@echo off
chcp 65001 >nul
title Test Working Bot

echo ========================================
echo     TEST WORKING ZEN DUEL ARENA BOT
echo ========================================
echo.

REM Закрываем все процессы
echo 🔍 Закрытие старых процессов...
taskkill /F /IM python.exe >nul 2>&1

REM Пауза
timeout /t 2 /nobreak >nul

REM Запускаем рабочий бот
echo 🚀 Запуск рабочего бота...
python working_bot.py

pause
