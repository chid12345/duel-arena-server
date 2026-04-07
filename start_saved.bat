@echo off
title Duel Arena - Saved Start
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

echo ==========================================
echo         DUEL ARENA SAVED START
echo ==========================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo [1/6] Creating Python 3.11 virtual environment...
    py -3.11 -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create .venv with Python 3.11
        echo Check that "py -3.11 --version" works.
        pause
        exit /b 1
    )
)

echo [2/6] Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate .venv
    pause
    exit /b 1
)

echo [3/6] Installing requirements...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install requirements
    pause
    exit /b 1
)

set "ENV_FILE=.env.local"
set "TELEGRAM_BOT_TOKEN="
set "ADMIN_USER_IDS="

if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
        if /I "%%A"=="TELEGRAM_BOT_TOKEN" set "TELEGRAM_BOT_TOKEN=%%B"
        if /I "%%A"=="ADMIN_USER_IDS" set "ADMIN_USER_IDS=%%B"
    )
)

if "%TELEGRAM_BOT_TOKEN%"=="" (
    echo.
    echo [4/6] First run setup
    set /p TELEGRAM_BOT_TOKEN=Paste TELEGRAM_BOT_TOKEN and press Enter: 
    if "!TELEGRAM_BOT_TOKEN!"=="" (
        echo ERROR: Token is empty. Cancelled.
        pause
        exit /b 1
    )
    set /p ADMIN_USER_IDS=Paste ADMIN_USER_IDS ^(optional, Enter to skip^): 

    > "%ENV_FILE%" echo TELEGRAM_BOT_TOKEN=!TELEGRAM_BOT_TOKEN!
    >> "%ENV_FILE%" echo ADMIN_USER_IDS=!ADMIN_USER_IDS!
    echo Saved local config to %ENV_FILE%
) else (
    echo [4/6] Loaded token from %ENV_FILE%
)

echo [5/6] Starting bot...
echo.
python main.py

echo.
echo [6/6] Bot stopped. Press any key to exit.
pause >nul
