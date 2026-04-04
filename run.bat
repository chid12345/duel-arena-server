@echo off
echo ========================================
echo        ZEN DUEL ARENA BOT LAUNCHER
echo ========================================
echo.

echo Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Checking bot token...
if "%TELEGRAM_BOT_TOKEN%"=="" (
    echo WARNING: 8681746802:AAF47i-iWGKJ7gSNc_Mx90_Rblmb7gIt4wA
    echo Please set environment variable:
    echo set TELEGRAM_BOT_TOKEN=your_bot_token_here
    echo.
    echo Starting with placeholder token...
)

echo.
echo ========================================
echo         STARTING ZEN DUEL ARENA BOT
echo ========================================
echo.

python main.py

echo.
echo Bot stopped. Press any key to exit...
pause
