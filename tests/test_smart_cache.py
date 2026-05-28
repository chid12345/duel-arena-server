"""Тесты smart_cache_middleware — кэширование статики TMA.

Главный страж: версионная JS/CSS (.js?v=…) должна получать длинный кэш,
иначе Telegram WebView перекачивает ~5 МБ скриптов при каждом открытии
игры → старт занимает 10-30с вместо 1-2с.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.testclient import TestClient

from api.tma_smart_cache import smart_cache_middleware


def _app() -> TestClient:
    app = FastAPI()
    app.middleware("http")(smart_cache_middleware)

    @app.get("/")
    def root():
        return PlainTextResponse("<html></html>", media_type="text/html")

    @app.get("/page.html")
    def page():
        return PlainTextResponse("<html></html>", media_type="text/html")

    @app.get("/{path:path}.js")
    def js(path: str):  # noqa: ARG001
        return PlainTextResponse("/* js */", media_type="application/javascript")

    @app.get("/{path:path}.css")
    def css(path: str):  # noqa: ARG001
        return PlainTextResponse("body{}", media_type="text/css")

    @app.get("/{path:path}.png")
    def png(path: str):  # noqa: ARG001
        return PlainTextResponse("png", media_type="image/png")

    @app.get("/api/player")
    def api_player():
        return JSONResponse({"ok": True})

    return TestClient(app)


def test_versioned_js_gets_long_cache():
    """?v=BUILD_VERSION для .js → 1 год immutable (главный фикс)."""
    r = _app().get("/scene_menu.js?v=2.23.26")
    assert "max-age=31536000" in r.headers["cache-control"]
    assert "immutable" in r.headers["cache-control"]
    assert "no-store" not in r.headers["cache-control"]


def test_versioned_css_gets_long_cache():
    r = _app().get("/wb_battle_cyber.css?v=2.23.26")
    assert "max-age=31536000" in r.headers["cache-control"]
    assert "immutable" in r.headers["cache-control"]


def test_html_no_store():
    """index.html / *.html — всегда свежие, иначе игра застрянет на старой
    версии после деплоя."""
    for url in ("/", "/page.html"):
        r = _app().get(url)
        assert "no-store" in r.headers["cache-control"], url


def test_png_seven_day_cache():
    r = _app().get("/skins/sila/1.png")
    assert "max-age=604800" in r.headers["cache-control"]


def test_api_response_not_cached():
    """API-ответы не получают наших Cache-Control — у них своя логика."""
    r = _app().get("/api/player")
    assert "cache-control" not in {k.lower() for k in r.headers}


def test_js_without_version_not_long_cached():
    """Если ?v= нет, длинный кэш ставить нельзя: иначе устаревший файл застрянет."""
    r = _app().get("/scene_menu.js")
    cc = r.headers.get("cache-control", "")
    assert "max-age=31536000" not in cc
