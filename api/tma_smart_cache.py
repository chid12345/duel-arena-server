"""HTTP middleware: Cache-Control для статики TMA."""

from fastapi import Request


async def smart_cache_middleware(request: Request, call_next):
    """
    Умное кэширование статики:
    - index.html / корень: no-store
    - *.js?v=HASH, *.css?v=HASH: кэш на 1 год
    - картинки, иконки: кэш на 7 дней
    """
    response = await call_next(request)
    path = request.url.path.lower()
    has_version = bool(request.query_params.get("v") or request.query_params.get("bv"))

    if request.method != "GET":
        return response

    if path == "/" or path.endswith(".html"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    elif has_version and path.endswith((".js", ".css")):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    elif path.endswith((".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".gif")):
        response.headers["Cache-Control"] = "public, max-age=604800"

    return response
