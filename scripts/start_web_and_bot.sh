#!/usr/bin/env sh
# Один процесс контейнера: HTTPS Mini App (uvicorn) + polling бота.
# Общий файл duel_arena.db — бот и API должны видеть одну БД.
set -e
PORT="${PORT:-8000}"
uvicorn api_server:app --host 0.0.0.0 --port "$PORT" &
WEB_PID=$!
cleanup() {
  kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
exec python main.py
