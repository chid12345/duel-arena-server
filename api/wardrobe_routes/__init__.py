from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from api.wardrobe_routes.core_routes import attach_wardrobe_core
from api.wardrobe_routes.usdt_routes import attach_wardrobe_usdt


def register_wardrobe_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    wardrobe_fn = attach_wardrobe_core(router, ctx)
    attach_wardrobe_usdt(router, ctx, wardrobe_fn)
    app.include_router(router)
