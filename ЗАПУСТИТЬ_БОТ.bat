@echo off
chcp 65001 >nul
title Duel Arena — Запуск бота
color 0A

echo.
echo  ╔══════════════════════════════════════╗
echo  ║       DUEL ARENA BOT LAUNCHER        ║
echo  ╚══════════════════════════════════════╝
echo.

REM ── Убиваем ВСЕ запущенные python.exe ──────────────────────
echo  [1/4] Останавливаем все процессы Python...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM pythonw.exe /T >nul 2>&1
taskkill /F /IM uvicorn.exe /T >nul 2>&1
echo        Готово.
echo.

REM ── Пауза чтобы порты освободились ─────────────────────────
timeout /t 2 /nobreak >nul

REM ── Проверяем: запущен ли Render? ───────────────────────────
echo  [2/4] Проверяем Render.com...
curl -s --max-time 6 "https://duel-arena-server-2.onrender.com/api/health" | findstr /C:"true" >nul 2>&1
if %errorlevel% == 0 (
    echo.
    color 0C
    echo  ╔══════════════════════════════════════════════════════════╗
    echo  ║   ❌  КОНФЛИКТ: Render.com сейчас АКТИВЕН!              ║
    echo  ║                                                          ║
    echo  ║   Запуск локального бота вызовет ошибку 409.            ║
    echo  ║                                                          ║
    echo  ║   Что делать:                                            ║
    echo  ║   1. Открой dashboard.render.com                        ║
    echo  ║   2. Выбери сервис "сервер дуэльной арены"              ║
    echo  ║   3. Нажми "Suspend Service" (приостановить)            ║
    echo  ║   4. Запусти этот файл снова                            ║
    echo  ╚══════════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
echo        Render не мешает. Продолжаем...
echo.

REM ── Активируем виртуальное окружение ───────────────────────
echo  [3/4] Активируем .venv...
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate
) else (
    echo  ВНИМАНИЕ: .venv не найден, используем системный Python
)
echo        Готово.
echo.

REM ── Запускаем бота ──────────────────────────────────────────
echo  [4/4] Запускаем бота...
echo.
color 0A
echo  ════════════════════════════════════════
echo  Бот запущен. Закрой это окно чтобы остановить.
echo  ════════════════════════════════════════
echo.

python main.py

echo.
color 07
echo  Бот остановлен.
pause
