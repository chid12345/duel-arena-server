"""HTTP middleware: Cache-Control для статики TMA + логирование медленных запросов."""

import logging
import time

from fastapi import Request

logger = logging.getLogger("perf")

# Порог в секундах — запросы медленнее этого пишутся в лог
_SLOW_REQUEST_THRESHOLD = 1.0


async def smart_cache_middleware(request: Request, call_next):
    """
    Умное кэширование статики + мониторинг производительности:
    - index.html / корень: no-store
    - *.js?v=HASH, *.css?v=HASH: кэш на 1 год
    - картинки, иконки: кэш на 7 дней
    - API-запросы медленнее 1 сек → WARNING в лог
    """
    t0 = time.monotonic()
    response = await call_next(request)
    elapsed = time.monotonic() - t0

    path = request.url.path.lower()
    is_api = path.startswith("/api/")

    # Логируем медленные API-запросы
    if is_api and elapsed > _SLOW_REQUEST_THRESHOLD:
        logger.warning(
            "SLOW %s %s — %.3fs",
            request.method,
            request.url.path,
            elapsed,
        )

    if request.method != "GET":
        return response

    has_version = bool(request.query_params.get("v") or request.query_params.get("bv"))

    if path == "/" or path.endswith(".html"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    elif has_version and path.endswith((".js", ".css")):
        response.headers["Cache-Control"] = "no-cache"
    elif path.endswith((".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".gif")):
        response.headers["Cache-Control"] = "public, max-age=604800"

    return response
