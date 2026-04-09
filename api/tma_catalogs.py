"""Каталоги магазина и пакетов монетизации для TMA."""

from config import (
    CRYPTOPAY_TESTNET,
    ELITE_AVATAR_ID,
    ELITE_AVATAR_STARS,
    ELITE_AVATAR_USDT,
    FULL_RESET_CRYPTO_USDT,
    PREMIUM_SUBSCRIPTION_STARS,
)

SHOP_CATALOG = {
    "hp_small": {"name": "Малое зелье HP", "price": 12, "currency": "gold", "icon": "🧪", "tab": "potions"},
    "hp_full": {"name": "Большое зелье HP", "price": 30, "currency": "gold", "icon": "⚗️", "tab": "potions"},
    "xp_boost": {"name": "Буст XP ×1.5 (5боёв)", "price": 100, "currency": "gold", "icon": "💊", "tab": "potions"},
    "stat_reset": {"name": "Сброс статов", "price": 50, "currency": "diamonds", "icon": "🔄", "tab": "special"},
}

STARS_PACKAGES = [
    {"id": "d100", "diamonds": 100, "stars": 150, "label": "100 💎"},
    {"id": "d300", "diamonds": 300, "stars": 390, "label": "300 💎"},
    {"id": "d500", "diamonds": 500, "stars": 650, "label": "500 💎"},
    {"id": "premium", "diamonds": 0, "stars": PREMIUM_SUBSCRIPTION_STARS, "label": "👑 Premium"},
]

ELITE_AVATAR_STARS_PACKAGE = {
    "id": "elite_avatar",
    "avatar_id": ELITE_AVATAR_ID,
    "label": "👑 Элитный образ",
    "stars": int(ELITE_AVATAR_STARS),
}

CRYPTO_PACKAGES = [
    {"id": "cd100", "diamonds": 100, "label": "100 💎", "usdt": "2.99"},
    {"id": "cd300", "diamonds": 300, "label": "300 💎", "usdt": "7.99"},
    {"id": "cd500", "diamonds": 500, "label": "500 💎", "usdt": "12.99"},
    {"id": "cdpremium", "diamonds": 0, "label": "👑 Premium", "usdt": "8.00", "premium": True},
    {
        "id": "cdfullreset",
        "diamonds": 0,
        "label": "🔄 Сброс прогресса",
        "hint": "Уровень и бои с нуля; золото, 💎, клан и рефералка сохраняются",
        "usdt": FULL_RESET_CRYPTO_USDT,
        "full_reset": True,
        "usdt_only": True,
    },
]

ELITE_AVATAR_CRYPTO_PACKAGE = {
    "id": "cd_elite_avatar",
    "avatar_id": ELITE_AVATAR_ID,
    "label": "👑 Элитный образ",
    "usdt": str(ELITE_AVATAR_USDT),
}

CRYPTOPAY_API_BASE = (
    "https://testnet-pay.crypt.bot/api" if CRYPTOPAY_TESTNET else "https://pay.crypt.bot/api"
)
