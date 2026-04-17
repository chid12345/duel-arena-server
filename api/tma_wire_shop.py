"""Регистрация роутов магазина/кошелька/платежей для TMA.

Содержит подключение: avatar_shop, wardrobe, shop, payment. Выделено из
`tma_wire_features.py` по Закону 1 — одно ответственное место для коммерции.
"""
from __future__ import annotations

from fastapi import FastAPI

from api.avatar_shop_routes import register_avatar_shop_routes
from api.payment_routes import register_payment_routes
from api.shop_routes import register_shop_routes
from api.wardrobe_routes import register_wardrobe_routes

from api.tma_auth import get_user_from_init_data
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
from api.tma_infra import _cache_invalidate, _rl_check, manager
from api.tma_notify import _notify_paid_full_reset, _send_tg_message
from api.tma_player_api import _player_api

from config import (
    BOT_TOKEN,
    CRYPTOPAY_TOKEN,
    DIAMONDS_CLASSES,
    ELITE_AVATAR_ID,
    ELITE_AVATAR_STARS,
    ELITE_AVATAR_USDT,
    FREE_CLASSES,
    GOLD_CLASSES,
    PREMIUM_SUBSCRIPTION_STARS,
    PREMIUM_XP_BONUS_PERCENT,
    RESET_STATS_COST_DIAMONDS,
    RESET_STATS_COST_DIAMONDS_USDT,
    USDT_CLASS_BASE,
)
from database import db


def wire_shop_routes(app: FastAPI) -> None:
    """Регистрирует роуты магазина/гардероба/платежей."""
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
