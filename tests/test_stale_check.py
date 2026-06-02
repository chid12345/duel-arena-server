"""
tests/test_stale_check.py — проверка stale-detector для Render zero-downtime.

Покрывает:
- нет RENDER_GIT_COMMIT (локальный запуск) → False
- наш commit == live commit → False (мы — текущий деплой)
- наш commit != live commit → True (мы — старый контейнер, надо выйти)
- /api/health недоступен → False (безопасный дефолт)
- public_url не задан → False
"""
from __future__ import annotations

import json
import io
from unittest.mock import patch


def _mock_urlopen(commit_v: str | None):
    """Возвращает контекст-менеджер, имитирующий ответ /api/health с заданным ?v=."""
    body = {
        "ok": True,
        "ts": 0,
        "version": "stub",
        "webapp_url": f"https://srv.onrender.com?v={commit_v}" if commit_v else "https://srv.onrender.com",
        "self_url": "https://srv.onrender.com",
        "url_mismatch": False,
    }
    class _Resp:
        def read(self_): return json.dumps(body).encode("utf-8")
        def __enter__(self_): return self_
        def __exit__(self_, *a): return False
    return lambda url, timeout=5: _Resp()


def test_no_render_commit_returns_false(monkeypatch):
    """Локальный запуск (нет RENDER_GIT_COMMIT) — никогда не stale."""
    monkeypatch.delenv("RENDER_GIT_COMMIT", raising=False)
    monkeypatch.setenv("WEBAPP_PUBLIC_URL", "https://srv.onrender.com")
    from bot_app.stale_check import is_stale_container
    assert is_stale_container() is False


def test_same_commit_not_stale(monkeypatch):
    """Наш commit == live commit → False (мы — текущий деплой)."""
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc12345" + "ff" * 16)
    monkeypatch.setenv("WEBAPP_PUBLIC_URL", "https://srv.onrender.com")
    with patch("urllib.request.urlopen", _mock_urlopen("abc12345")):
        from bot_app.stale_check import is_stale_container
        assert is_stale_container() is False


def test_different_commit_is_stale(monkeypatch):
    """Наш commit != live commit → True (мы старый контейнер)."""
    monkeypatch.setenv("RENDER_GIT_COMMIT", "deadbeefcafe" + "00" * 12)
    monkeypatch.setenv("WEBAPP_PUBLIC_URL", "https://srv.onrender.com")
    with patch("urllib.request.urlopen", _mock_urlopen("abc12345")):
        from bot_app.stale_check import is_stale_container
        assert is_stale_container() is True


def test_health_unreachable_returns_false(monkeypatch):
    """Если /api/health не отвечает — НЕ считаем stale (безопасный дефолт)."""
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc12345" + "00" * 16)
    monkeypatch.setenv("WEBAPP_PUBLIC_URL", "https://srv.onrender.com")
    def boom(*a, **k): raise OSError("connection refused")
    with patch("urllib.request.urlopen", boom):
        from bot_app.stale_check import is_stale_container
        assert is_stale_container() is False


def test_no_public_url_returns_false(monkeypatch):
    """Если WEBAPP_PUBLIC_URL и RENDER_EXTERNAL_URL не заданы — False."""
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc12345" + "00" * 16)
    monkeypatch.delenv("WEBAPP_PUBLIC_URL", raising=False)
    monkeypatch.delenv("RENDER_EXTERNAL_URL", raising=False)
    from bot_app.stale_check import is_stale_container
    assert is_stale_container() is False


def test_health_response_without_v_param_returns_false(monkeypatch):
    """webapp_url без ?v=<commit> — считаем live недоступным, не stale."""
    monkeypatch.setenv("RENDER_GIT_COMMIT", "abc12345" + "00" * 16)
    monkeypatch.setenv("WEBAPP_PUBLIC_URL", "https://srv.onrender.com")
    with patch("urllib.request.urlopen", _mock_urlopen(None)):
        from bot_app.stale_check import is_stale_container
        assert is_stale_container() is False
