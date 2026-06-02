"""
Проверка «я — устаревший контейнер?» для Render zero-downtime деплоев.

Контекст: Render при деплое поднимает НОВЫЙ контейнер рядом со СТАРЫМ.
У Telegram-бота одна polling-сессия на токен — два контейнера дерутся.
Решение: при каждом Conflict старый сверяет свой commit hash с тем,
что live на проде (через GET /api/health). Если live-коммит ≠ его —
он устарел → выходит молча, не пинает нового.

Используется из bot_app/error_handler.py и main.py (retry-loop).
"""
from __future__ import annotations

import json
import logging
import os
import urllib.request

logger = logging.getLogger(__name__)


def _own_commit_short() -> str:
    """Короткий хеш коммита нашего контейнера (8 символов, как в start.sh)."""
    full = (os.getenv("RENDER_GIT_COMMIT") or "").strip()
    return full[:8] if full else ""


def _live_commit_short(public_url: str, timeout: int = 5) -> str | None:
    """Прочитать short-commit с live /api/health. None если не достучались."""
    try:
        with urllib.request.urlopen(public_url.rstrip("/") + "/api/health", timeout=timeout) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        logger.warning("stale check: /api/health unreachable (%s)", e)
        return None

    # api_server.py отдаёт webapp_url вида "https://host.onrender.com?v=<short-commit>"
    webapp_url = str(data.get("webapp_url") or "")
    if "?v=" not in webapp_url:
        return None
    return webapp_url.split("?v=")[-1].split("&")[0]


def is_stale_container() -> bool:
    """
    True ⇔ мы — старый контейнер (наш commit ≠ live на /api/health).

    Возвращает False при любой неопределённости (нет env-var, прод
    недоступен, нет ?v= в ответе) — безопасный дефолт: не выходим зря.
    """
    my = _own_commit_short()
    if not my:
        # Локальный запуск / нет RENDER_GIT_COMMIT — мы НЕ stale по определению
        return False

    public_url = (
        (os.getenv("WEBAPP_PUBLIC_URL") or "").strip()
        or (os.getenv("RENDER_EXTERNAL_URL") or "").strip()
    )
    if not public_url:
        return False

    live = _live_commit_short(public_url)
    if not live:
        return False  # /api/health недоступен → не выходим (безопасно)

    if live != my:
        logger.warning(
            "🪦 Я (commit=%s) устарел: live=%s. Выхожу, чтоб не бодаться с новым.",
            my, live,
        )
        return True
    return False
