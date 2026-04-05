#!/usr/bin/env sh
# Render Web Service проверяет открытый PORT — главный процесс должен быть uvicorn.
# Бот (polling) в фоне; при остановке контейнера оба завершаются.
set -e
PORT="${PORT:-8000}"
python main.py &
BOT_PID=$!
cleanup() {
  kill "$BOT_PID" 2>/dev/null || true
  wait "$BOT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
uvicorn api_server:app --host 0.0.0.0 --port "$PORT"
