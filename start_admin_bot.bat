@echo off
cd /d "%~dp0"

for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
    set "%%A=%%B"
)

python admin_bot/bot.py
pause
