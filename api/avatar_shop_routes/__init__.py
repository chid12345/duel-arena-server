from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from api.avatar_shop_routes.basic_routes import attach_avatar_basic
from api.avatar_shop_routes.elite_routes import attach_avatar_elite


def register_avatar_shop_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    attach_avatar_basic(router, ctx)
    attach_avatar_elite(router, ctx)
    app.include_router(router)
