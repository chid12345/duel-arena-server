"""
FastAPI сервер для Duel Arena TMA (Telegram Mini App).
Шарит database.py и battle_system.py с Telegram-ботом.

Локально: uvicorn api_server:app --host 0.0.0.0 --port 8000
Прод: см. Dockerfile + scripts/start_web_and_bot.sh и DEPLOY_TMA.md
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from api.tma_smart_cache import smart_cache_middleware
from api.tma_wire_features import wire_tma_feature_routes
from api.tma_wire_inline import wire_tma_inline_routes
from api.warrior_type_route import register_warrior_type_route

from version import GAME_VERSION

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


async def _wb_tick_loop() -> None:
    """Боевой тик WB — в процессе uvicorn, чтобы wb_broadcast_tick видел WS-соединения.
    main.py (PTB) держит только scheduler (scheduled→active); broadcast живёт здесь."""
    from jobs.world_boss_battle_tick import world_boss_battle_tick_job
    while True:
        await asyncio.sleep(1)
        try:
            await world_boss_battle_tick_job(None)
        except Exception as e:
            logger.warning("wb_tick_loop: %s", e)


@asynccontextmanager
async def _lifespan(app):  # noqa: ARG001
    task = asyncio.create_task(_wb_tick_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Duel Arena TMA API", version="1.0", lifespan=_lifespan)

APP_BUILD_VERSION = (
    GAME_VERSION
    or (os.getenv("WEBAPP_URL_VERSION") or "").strip()
    or (os.getenv("RENDER_GIT_COMMIT") or "").strip()[:8]
    or "dev"
)

_self_host = (os.getenv("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
_webapp_host = (os.getenv("WEBAPP_PUBLIC_URL") or "").strip().rstrip("/").split("?")[0]
if _self_host and _webapp_host and _self_host != _webapp_host:
    logger.warning(
        "⚠️  WEBAPP_PUBLIC_URL (%s) differs from RENDER_EXTERNAL_URL (%s)! "
        "Mini App will open on a DIFFERENT service → API calls will fail. "
        "Fix: set WEBAPP_PUBLIC_URL=%s in Render env vars.",
        _webapp_host,
        _self_host,
        _self_host,
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.middleware("http")(smart_cache_middleware)

wire_tma_inline_routes(app)
wire_tma_feature_routes(app, app_build_version=APP_BUILD_VERSION)
register_warrior_type_route(app)

webapp_dir = os.path.join(os.path.dirname(__file__), "webapp")


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def serve_index():
    html_path = os.path.join(webapp_dir, "index.html")
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="index.html not found")
    html = html.replace("__BUILD_VERSION__", APP_BUILD_VERSION)
    no_cache = {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    return HTMLResponse(content=html, headers=no_cache)


if os.path.isdir(webapp_dir):
    app.mount("/", StaticFiles(directory=webapp_dir, html=True), name="webapp")
