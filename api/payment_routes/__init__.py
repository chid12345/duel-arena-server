from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from api.payment_routes.crypto_check import register_crypto_check_route
from api.payment_routes.crypto_invoice import register_crypto_invoice_route
from api.payment_routes.crypto_webhook import register_crypto_webhook_route
from api.payment_routes.stars import register_stars_routes


def register_payment_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    register_stars_routes(router, ctx)
    register_crypto_invoice_route(router, ctx)
    register_crypto_webhook_route(router, ctx)
    register_crypto_check_route(router, ctx)
    app.include_router(router)
