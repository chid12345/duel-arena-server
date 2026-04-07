# Деплой Telegram Mini App (TMA) + бота

В репозитории уже есть:

- **`api_server.py`** — FastAPI: API для веб-клиента и раздача статики из **`webapp/`** по корню `/`.
- **`main.py`** — Telegram-бот (polling).

Чтобы **бот и Mini App видели одну SQLite** (`duel_arena.db`), в проде их запускают **в одном контейнере**: скрипт `scripts/start_web_and_bot.sh` поднимает `uvicorn` на `$PORT` и затем `python main.py`.

## 1. Поднять сервер с HTTPS

### Вариант A: Railway

1. Создай проект → **Deploy from GitHub** (или загрузи репо).
2. Укажи **Dockerfile** (репозиторий уже содержит `Dockerfile` и `railway.toml`).
3. В **Variables** задай:
   - `TELEGRAM_BOT_TOKEN` — токен бота.
   - `WEBAPP_PUBLIC_URL` — публичный URL сервиса **без** завершающего `/`, например `https://zenduelarena-production.up.railway.app` (скопируй из вкладки **Networking → Public URL** после первого деплоя).
   - При необходимости `ADMIN_USER_IDS`.
4. После деплоя открой в браузере `https://…/api/health` — должен ответить JSON.

### Вариант B: Render

1. New → **Web Service** → подключи репозиторий, **Docker**.
2. Те же переменные окружения, что выше. `WEBAPP_PUBLIC_URL` возьми из URL сервиса Render (`https://<имя>.onrender.com`).
3. Health check path: **`/api/health`**.

### Вариант C: VPS

Установи Docker, склонируй репо, задай `.env` или `export`, собери и запусти:

```bash
docker build -t duel-arena .
docker run -d --restart unless-stopped \
  -e TELEGRAM_BOT_TOKEN="..." \
  -e WEBAPP_PUBLIC_URL="https://your-domain.com" \
  -p 8000:8000 \
  duel-arena
```

Перед этим поставь **reverse proxy** (Caddy / nginx) с TLS на тот же порт или на приложение за прокси.

## 2. Зарегистрировать Web App в BotFather

1. Открой [@BotFather](https://t.me/BotFather) → выбери бота.
2. **`/newapp`** (или **Bot Settings → Configure Mini App**).
3. Укажи **URL** ровно тот же, что в `WEBAPP_PUBLIC_URL` (корень сайта; откроется `index.html`).

После изменения URL перезапусти сервис и при необходимости снова вызови `/start` в боте — появятся кнопка **«🎮 Mini App»** в меню и кнопка **«🎮 Арена»** в шапке чата (если задан `WEBAPP_PUBLIC_URL`).

## 3. Локальная проверка без HTTPS

Telegram Mini App в клиенте требует **HTTPS**. Локально можно проверять только API:

```bash
uvicorn api_server:app --host 127.0.0.1 --port 8000
```

Для полноценного теста TMA используй туннель (ngrok, cloudflared) и подставь выданный `https://…` в `WEBAPP_PUBLIC_URL` и в BotFather.

## 4. База данных

На бесплатных PaaS диск часто **эфемерный**: при redeploy `duel_arena.db` обнуляется. Для постоянства подключи **volume** (Railway Volume / Render Disk) и положи БД в примонтированный каталог — для этого позже стоит вынести путь к БД в переменную окружения.

## 5. Только API без бота (не рекомендуется с SQLite)

Если запустить только `uvicorn api_server:app`, а бота — на другой машине, **будут две разные SQLite** и расхождение прогресса. Для раздельного деплоя нужна общая БД (PostgreSQL и т.д.).
