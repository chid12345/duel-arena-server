"""Подключение модульных роутов TMA (магазин, соц, прогресс, realtime)."""

from __future__ import annotations

from fastapi import FastAPI

from api.avatar_shop_routes import register_avatar_shop_routes
from api.task_routes import register_task_routes
from api.endless_routes import register_endless_routes
from api.payment_routes import register_payment_routes
from api.progression_routes import register_progression_routes
from api.shop_routes import register_shop_routes
from api.social_routes import register_social_routes
from api.system_realtime_routes import register_system_realtime_routes
from api.titan_training_routes import register_titan_training_routes
from api.wardrobe_routes import register_wardrobe_routes
from api.world_boss_routes import register_world_boss_routes
from api.world_boss_ws import register_world_boss_ws_routes
from api import world_boss_chests as _wb_chests  # noqa: F401 — side-effect: регистрация WB-сундуков в ALL_BOX_IDS

from api.tma_auth import get_user_from_init_data
from api.tma_battle_api import _battle_state_api
from api.tma_bots import _endless_bot_for_wave, _titan_boss_for_floor
from api.tma_catalogs import (
    CRYPTO_PACKAGES,
    CRYPTOPAY_API_BASE,
    ELITE_AVATAR_CRYPTO_PACKAGE,
    ELITE_AVATAR_STARS_PACKAGE,
    SHOP_CATALOG,
    STARS_PACKAGES,
    STARS_SCROLL_PACKAGES,
    USDT_SCROLL_PACKAGES,
)
from api.tma_infra import _cache_invalidate, _cache_set, _rl_check, manager
from api.tma_notify import _notify_paid_full_reset, _send_tg_message
from api.tma_player_api import _player_api, _premium_fields
from api.tma_startup import attach_tma_startup
from api.admin_purchases import register_admin_purchases
from api.stats_routes import register_stats_routes
from api.tma_weekly_quests import _iso_week_key, _weekly_quests_status

from battle_system import battle_system
from config import (
    BOT_TOKEN,
    CRYPTOPAY_TOKEN,
    DIAMONDS_CLASSES,
    ELITE_AVATAR_ID,
    ELITE_AVATAR_STARS,
    ELITE_AVATAR_USDT,
    FREE_CLASSES,
    GOLD_CLASSES,
    HP_MIN_BATTLE_PCT,
    PLAYER_START_CRIT,
    PLAYER_START_MAX_HP,
    PREMIUM_SUBSCRIPTION_STARS,
    PREMIUM_XP_BONUS_PERCENT,
    RESET_STATS_COST_DIAMONDS,
    RESET_STATS_COST_DIAMONDS_USDT,
    USDT_CLASS_BASE,
    stamina_stats_invested,
)
from database import db
from version import GAME_VERSION


def wire_tma_feature_routes(app: FastAPI, *, app_build_version: str) -> None:
    register_avatar_shop_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_player_api": _player_api,
            "_cache_invalidate": _cache_invalidate,
            "_rl_check": _rl_check,
            "ELITE_AVATAR_ID": ELITE_AVATAR_ID,
            "ELITE_AVATAR_STARS": ELITE_AVATAR_STARS,
            "ELITE_AVATAR_USDT": ELITE_AVATAR_USDT,
            "BOT_TOKEN": BOT_TOKEN,
            "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
            "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
            "manager": manager,
            "_send_tg_message": _send_tg_message,
        },
    )
    register_wardrobe_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_player_api": _player_api,
            "_cache_invalidate": _cache_invalidate,
            "_rl_check": _rl_check,
            "FREE_CLASSES": FREE_CLASSES,
            "GOLD_CLASSES": GOLD_CLASSES,
            "DIAMONDS_CLASSES": DIAMONDS_CLASSES,
            "USDT_CLASS_BASE": USDT_CLASS_BASE,
            "RESET_STATS_COST_DIAMONDS": RESET_STATS_COST_DIAMONDS,
            "RESET_STATS_COST_DIAMONDS_USDT": RESET_STATS_COST_DIAMONDS_USDT,
            "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
            "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
        },
    )
    register_shop_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_rl_check": _rl_check,
            "PREMIUM_SUBSCRIPTION_STARS": PREMIUM_SUBSCRIPTION_STARS,
            "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
            "SHOP_CATALOG": SHOP_CATALOG,
            "STARS_PACKAGES": STARS_PACKAGES,
            "CRYPTO_PACKAGES": CRYPTO_PACKAGES,
            "USDT_SCROLL_PACKAGES": USDT_SCROLL_PACKAGES,
            "ELITE_AVATAR_STARS_PACKAGE": ELITE_AVATAR_STARS_PACKAGE,
            "ELITE_AVATAR_CRYPTO_PACKAGE": ELITE_AVATAR_CRYPTO_PACKAGE,
        },
    )
    register_payment_routes(
        app,
        {
            "db": db,
            "manager": manager,
            "get_user_from_init_data": get_user_from_init_data,
            "_player_api": _player_api,
            "_cache_invalidate": _cache_invalidate,
            "_send_tg_message": _send_tg_message,
            "_notify_paid_full_reset": _notify_paid_full_reset,
            "_rl_check": _rl_check,
            "STARS_PACKAGES": STARS_PACKAGES,
            "STARS_SCROLL_PACKAGES": STARS_SCROLL_PACKAGES,
            "CRYPTO_PACKAGES": CRYPTO_PACKAGES,
            "USDT_SCROLL_PACKAGES": USDT_SCROLL_PACKAGES,
            "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
            "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
            "BOT_TOKEN": BOT_TOKEN,
            "PREMIUM_XP_BONUS_PERCENT": PREMIUM_XP_BONUS_PERCENT,
        },
    )
    register_social_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_rl_check": _rl_check,
            "_send_tg_message": _send_tg_message,
            "CRYPTOPAY_TOKEN": CRYPTOPAY_TOKEN,
            "CRYPTOPAY_API_BASE": CRYPTOPAY_API_BASE,
        },
    )
    register_progression_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_cache_invalidate": _cache_invalidate,
            "_weekly_quests_status": _weekly_quests_status,
        },
    )
    register_titan_training_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "battle_system": battle_system,
            "_battle_state_api": _battle_state_api,
            "_titan_boss_for_floor": _titan_boss_for_floor,
            "_player_api": _player_api,
            "_cache_invalidate": _cache_invalidate,
            "_cache_set": _cache_set,
            "_rl_check": _rl_check,
            "stamina_stats_invested": stamina_stats_invested,
            "_iso_week_key": _iso_week_key,
            "PLAYER_START_MAX_HP": PLAYER_START_MAX_HP,
            "PLAYER_START_CRIT": PLAYER_START_CRIT,
            "HP_MIN_BATTLE_PCT": HP_MIN_BATTLE_PCT,
        },
    )
    register_endless_routes(
        app,
        {
            "db": db,
            "get_user_from_init_data": get_user_from_init_data,
            "_premium_fields": _premium_fields,
            "_iso_week_key": _iso_week_key,
            "_endless_bot_for_wave": _endless_bot_for_wave,
            "battle_system": battle_system,
            "_battle_state_api": _battle_state_api,
        },
    )
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
