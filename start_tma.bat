@echo off
echo Starting Duel Arena TMA API server...
echo Open in browser: http://localhost:8000
echo.
call .venv\Scripts\activate
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
pause
