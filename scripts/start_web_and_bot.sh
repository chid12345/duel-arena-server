#!/usr/bin/env sh
# Render Web Service проверяет открытый PORT — главный процесс должен быть uvicorn.
# Бот (polling) в фоне; при остановке контейнера оба завершаются.
set -e
PORT="${PORT:-8000}"

# Вшиваем хэш коммита в index.html чтобы сломать кэш Telegram WebView при каждом деплое.
BUILD_VER="${RENDER_GIT_COMMIT:-dev}"
BUILD_VER=$(echo "$BUILD_VER" | cut -c1-8)
INDEX_HTML="$(dirname "$0")/../webapp/index.html"
if [ -f "$INDEX_HTML" ]; then
  sed -i "s/__BUILD_VERSION__/$BUILD_VER/g" "$INDEX_HTML"
  echo "==> index.html patched with build version: $BUILD_VER"
fi

python main.py &
BOT_PID=$!
cleanup() {
  kill "$BOT_PID" 2>/dev/null || true
  wait "$BOT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
uvicorn api_server:app --host 0.0.0.0 --port "$PORT"
