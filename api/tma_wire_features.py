"""Подключение модульных роутов TMA — facade.

Тонкая точка сборки: делегирует shop/gameplay в подмодули `tma_wire_shop.py`
и `tma_wire_gameplay.py`, сама регистрирует только системные/realtime/WB/tasks
блоки и обработчики startup (Закон 1/9).
"""

from __future__ import annotations

from fastapi import FastAPI

from api.task_routes import register_task_routes
from api.system_realtime_routes import register_system_realtime_routes
from api.active_session_route import register_active_session_route
from api.world_boss_routes import register_world_boss_routes
from api.world_boss_ws import register_world_boss_ws_routes
from api import world_boss_chests as _wb_chests  # noqa: F401 — side-effect: регистрация WB-сундуков в ALL_BOX_IDS

from api.tma_auth import get_user_from_init_data
from api.tma_catalogs import CRYPTOPAY_API_BASE, USDT_SCROLL_PACKAGES
from api.tma_infra import _cache_invalidate, manager
from api.tma_notify import _send_tg_message
from api.tma_player_api import _player_api
from api.tma_startup import attach_tma_startup
from api.admin_purchases import register_admin_purchases
from api.stats_routes import register_stats_routes

from api.tma_wire_gameplay import wire_gameplay_routes
from api.tma_wire_shop import wire_shop_routes

from config import CRYPTOPAY_TOKEN
from database import db
from version import GAME_VERSION


def wire_tma_feature_routes(app: FastAPI, *, app_build_version: str) -> None:
    wire_shop_routes(app)
    wire_gameplay_routes(app)
    register_system_realtime_routes(
        app,
        {
            "db": db,
            "manager": manager,
            "get_user_from_init_data": get_user_from_init_data,
            "_player_api": _player_api,
            "APP_BUILD_VERSION": app_build_version,
            "GAME_VERSION": GAME_VERSION,
            "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
            "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
        },
    )
    register_admin_purchases(app, db=db)
    register_stats_routes(app, db=db)
    register_world_boss_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
        },
    )
    register_active_session_route(
        app,
        db=db,
        get_user_from_init_data=get_user_from_init_data,
    )
    register_world_boss_ws_routes(app)
    register_task_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_cache_invalidate": _cache_invalidate,
        },
    )
    attach_tma_startup(
        app,
        db=db,
        _cache_invalidate=_cache_invalidate,
        _send_tg_message=_send_tg_message,
        manager=manager,
        CRYPTOPAY_TOKEN=CRYPTOPAY_TOKEN,
        CRYPTOPAY_API_BASE=CRYPTOPAY_API_BASE,
        USDT_SCROLL_PACKAGES=USDT_SCROLL_PACKAGES,
    )
