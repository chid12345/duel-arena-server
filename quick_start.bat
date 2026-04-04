@echo off
chcp 65001 >nul
title Quick Start ZenDuelArena Bot

echo ========================================
echo    QUICK START - ZEN DUEL ARENA BOT
echo ========================================
echo.

REM Проверяем Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python не найден!
    pause
    exit /b 1
)

REM Запускаем простой лаунчер
python simple_launcher.py

pause
