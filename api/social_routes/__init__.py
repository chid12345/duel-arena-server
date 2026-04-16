from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from api.social_routes.clan_routes import attach_social_clan
from api.social_routes.clan_extra_routes import attach_social_clan_extra
from api.social_routes.referral_clan import attach_social_referral_clan
from api.social_routes.withdraw import attach_social_withdraw


def register_social_routes(app, ctx: Dict[str, Any]) -> None:
    router = APIRouter()
    attach_social_referral_clan(router, ctx)
    attach_social_clan(router, ctx)
    attach_social_clan_extra(router, ctx)
    attach_social_withdraw(router, ctx)
    app.include_router(router)
